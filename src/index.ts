import express from "express";

import "dotenv/config";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import {
  MicrosoftGraphSubscription,
  bulkInsertMailfolders,
  bulkInsertMessages,
  createLocalSubscription,
  createMailBox,
  esclient,
  getUserMailBox,
} from "./elastic";
import bodyParser from "body-parser";
import { azureGet, azurePatch, azurePost } from "./azureGraph";
import {
  decryptPayload,
  decryptRSAWithPrivateKey,
  verifySignature,
} from "./certHelper";
import { createServer } from "http";
import { Server } from "socket.io";
import EventEmitter from "events";
import { Queue, Worker } from "bullmq";
import { redisClient } from "./redis";

interface ServerToClientEvents {
  newmail: (payload: {
    id: string;
    subject: string;
    bodyPreview: string;
    receivedDateTime: string;
    from: {
      emailAddress: {
        name: string;
        address: string;
      };
    };
    isRead: string;
    isDraft: string;
    importance: string;
    changeType: "created" | "updated";
  }) => void;
  session: (payload: { sessionID: string; username: string }) => void;
}

interface ClientToServerEvents {
  register: (args: { username: string }) => void;
}

interface InterServerEvents {}

interface SocketData {
  sessionID: string;
  username: string;
}

const SERVER_PORT = process.env.PORT || 3000;

const app = express();

export const httpServer = createServer(app);

const subsQueue = new Queue("subsQueue", { connection: redisClient });

const worker = new Worker(
  "subsQueue",
  async (job) => {
    // console.log({ subscriptionPayload });
    const subscription: MicrosoftGraphSubscription = await azurePost(
      job.data.subscriptionPayload
    );

    await createLocalSubscription({
      ...job.data.subscription,
      userId: job.data.me.id,
      mailFolderId: job.data.mailFolder.id,
    });
  },
  { connection: redisClient }
);

worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    // credentials: true,
  },
});

const myEmitter = new EventEmitter();

io.on("connection", (socket) => {
  myEmitter.on("newMailEvent", (data) => {
    socket.emit(`newmail-${data.username}`, data);
  });
});

io.engine.on("connection_error", (err) => {
  console.log("Error", err.req, err.message, err.context);
});

app.use(cors());
app.use(bodyParser.json());

// setup webhook endpoint
// https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks?tabs=http
// https://learn.microsoft.com/en-us/graph/change-notifications-overview
// https://learn.microsoft.com/en-us/graph/change-notifications-lifecycle-events?tabs=http
// https://learn.microsoft.com/en-us/graph/api/resources/change-notifications-api-overview?view=graph-rest-1.0
// https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0&tabs=http

app.post("/notification-client", async (req, res) => {
  const subscriptionDataValue = req.body?.value?.[0];

  const mailFolderId = req.query?.mailFolderId;
  const username = req.query?.username;

  console.log("notification aayo");

  if (subscriptionDataValue) {
    const symmetricKey = decryptRSAWithPrivateKey(
      process.env.CERT_PRIVATE_KEY,
      subscriptionDataValue.encryptedContent.dataKey
    );

    // Validate the signature on the encrypted content
    const isSignatureValid = verifySignature(
      subscriptionDataValue.encryptedContent.dataSignature,
      subscriptionDataValue.encryptedContent.data,
      symmetricKey
    );

    if (!isSignatureValid) {
      res.sendStatus(202);
      console.log("invalid signature !!!");
      return;
    }
    const finalPayload = decryptPayload(
      subscriptionDataValue.encryptedContent.data,
      symmetricKey
    );

    console.log({ finalPayload: JSON.parse(finalPayload) });

    if (subscriptionDataValue.resourceData.id && finalPayload) {
      myEmitter.emit("newMailEvent", {
        id: subscriptionDataValue.resourceData.id,
        changeType: subscriptionDataValue.changeType,
        username,
        mailFolderId,
        ...JSON.parse(finalPayload),
      });
    }

    // todo
    // update email_messages and mailboxes db with the finalPayload
    // emit socket event to frontend
  }

  console.log("notification webhook", {
    body: JSON.stringify(req.body, null, 2),
  });

  // res.status(200).json({ data: "" });

  const validationToken = req.query.validationToken;

  if (validationToken) {
    res.set("Content-Type", "text/plain");
    res.status(200).send(validationToken);
  } else {
    res.sendStatus(202);
    console.log("Validation request has no validation token.");
  }
});

app.post("/lifecycle-notifications", async (req, res) => {
  console.log("lifecycle-notifications", {
    body: JSON.stringify(req.body, null, 2),
  });
  console.log("lifecycle-notifications", {
    query: JSON.stringify(req.query, null, 2),
  });

  const validationToken = req.query.validationToken;

  if (validationToken) {
    res.set("Content-Type", "text/plain");
    res.status(200).send(validationToken);
    return;
  }

  const lifecycleEventValue = req.body?.value?.[0];

  if (lifecycleEventValue?.clientState !== process.env.SECRET_CLIENT_STATE) {
    res.sendStatus(202);
    console.log("secret client state didnt match !!");
    return;
  }

  if (lifecycleEventValue?.lifecycleEvent === "reauthorizationRequired") {
    const user: any = await getUserMailBox({
      userId: req.query.user_id,
    });

    await azurePatch({
      accessToken: user._source.access_token,
      urlPart: `subscriptions/${lifecycleEventValue.subscriptionId}`,
      data: {
        // add 4000 minutes to current time
        expirationDateTime: new Date(
          new Date().getTime() + 4000 * 60 * 1000
        ).toISOString(),
      },
    });
  }
  res.sendStatus(202);
  console.log("Validation request has no validation token.");
});

app.post("/create-user", async (req, res) => {
  // todo: validate body params

  const { token: accessToken } = req.headers as { token: string };
  try {
    const me = await azureGet({
      accessToken: accessToken,
      urlPart: "/me",
    });

    await createMailBox({
      emailAddress: me.mail,
      userId: me.id,
      accessToken: accessToken,
    });

    // const { value: mailMessages } = await azureGet({
    //   accessToken: accessToken,
    //   urlPart: "/me/messages?top=500",
    // });

    const { value: mailFolders } = await azureGet({
      accessToken: accessToken,
      urlPart: "/me/mailFolders?top=10",
    });

    //remove later
    // const mailFolders = mailFolders1.filter(
    //   (a) => a.displayName === "Inbox" || a.displayName === "Drafts"
    // );
    await bulkInsertMailfolders({
      userId: me.id,
      mail: me.mail,
      mailFolders,
    });

    const mailFolderMap = new Map();

    for (let i = 0; i < mailFolders?.length; i++) {
      const mailFolder = mailFolders[i];

      const { value: folderMails } = await azureGet({
        accessToken: accessToken,
        urlPart: `/me/mailFolders/${mailFolder.id}/messages?top=200`,
      });

      mailFolderMap.set(mailFolder.id, folderMails);
      if (folderMails?.length > 0) {
        await bulkInsertMessages({
          userId: me.id,
          mail: me.mail,
          mailFolderId: mailFolder.id,
          mailFolderName: mailFolder.name,
          mailMessages: folderMails,
        });
      }

      const subscriptionPayload = {
        accessToken: accessToken,
        urlPart: "/subscriptions",
        data: {
          changeType: "created,updated,deleted",
          notificationUrl: `${process.env.WEBHOOK_BASE_URL}/notification-client?username=${me.userPrincipalName}&mailFolderId=${mailFolder.id}`,
          // lifecycleNotificationUrl: `${process.env.WEBHOOK_BASE_URL}/lifecycle-notifications`,
          resource: `/users/${me.id}/mailFolders/${mailFolder.id}/messages?$select=Subject,bodyPreview,receivedDateTime,from,isRead,isDraft,id,importance,flag`,
          includeResourceData: true,
          encryptionCertificate: process.env.CERT_PUBLIC_KEY,
          encryptionCertificateId: process.env.CERT_ID,
          expirationDateTime: new Date(
            new Date().getTime() + 4000 * 60 * 1000
          ).toISOString(),
          clientState: process.env.SECRET_CLIENT_STATE,
        },
      };

      // const createMailFolderSubscription = async (subscriptionPayload, me, mailFolder) => {
      //   // console.log({ subscriptionPayload });
      //   const subscription: MicrosoftGraphSubscription = await azurePost(
      //     subscriptionPayload
      //   );

      //   await createLocalSubscription({
      //     ...subscription,
      //     userId: me.id,
      //     mailFolderId: mailFolder.id,
      //   });
      // };

      const hasSubcriptionIndex = await esclient.indices.exists({
        index: "subscriptions",
      });

      if (!hasSubcriptionIndex) {
        await subsQueue.add("createSubscription", {
          subscriptionPayload,
          me,
          mailFolder,
        });
        continue;
      }

      const currentSubscriptions = await esclient.search({
        index: "subscriptions",
        query: {
          bool: {
            must: [
              { match: { userId: me.id } },
              { match: { mailFolderId: mailFolder.id } },
            ],
          },
        },
      });

      if (!currentSubscriptions.hits?.hits?.length) {
        await subsQueue.add("createSubscription", {
          subscriptionPayload,
          me,
          mailFolder,
        });
      }
    }

    // const localEmailMessages: any = await esclient.search({
    //   index: "email_messages",
    //   size: 200,
    //   query: {
    //     match: {
    //       userId: me.id,
    //     },
    //   },
    // });

    // const responseMails = localEmailMessages?.hits?.hits.map((data: any) => {
    //   const mail = data._source;
    //   return {
    //     id: mail.id,
    //     isRead: mail.isRead,
    //     isDraft: mail.isDraft,
    //     subject: mail.subject,
    //     bodyPreview: mail.bodyPreview,
    //     sender: {
    //       name: mail.sender?.emailAddress?.name,
    //       email: mail.sender?.emailAddress?.address,
    //     },
    //     userId: mail.userId,
    //     flagStatus: mail.flag?.flagStatus,
    //     mailFolderId: mail.mailFolderId,
    //     mailFolderName: mail.mailFolderName,
    //   };
    // });

    res.status(200).json({
      data: { responseMails: Object.fromEntries(mailFolderMap), mailFolders },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/mails", async (req, res) => {
  const { token: accessToken } = req.headers as { token: string };

  const me = await azureGet({
    accessToken: accessToken,
    urlPart: "/me",
  });

  const mailMessages = await esclient.search({
    index: "email_messages",
    query: {
      match: {
        userId: me.id,
      },
    },
  });

  res.status(200).json({ data: mailMessages.hits.hits });
});

httpServer.listen(SERVER_PORT, () =>
  console.log(` app listening on port ${SERVER_PORT}!`)
);
