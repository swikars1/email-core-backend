import express from "express";

import "dotenv/config";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import {
  MicrosoftGraphSubscription,
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

// fetch all mails(graph api) and update in db lets do first 500 for now
// graph.microsoft.com/v1.0/me/messages?top=500
// update in mails email_messages index(include the primary user emails as well)
// update last_sync_time, sync_status in mailboxes index

// setup webhook endpoint
// https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks?tabs=http
// https://learn.microsoft.com/en-us/graph/change-notifications-overview
// https://learn.microsoft.com/en-us/graph/change-notifications-lifecycle-events?tabs=http
// https://learn.microsoft.com/en-us/graph/api/resources/change-notifications-api-overview?view=graph-rest-1.0
// track mail changes from webhook and update index
// update client side at the same time

// https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0&tabs=http
// https://www.youtube.com/watch?v=GTb33-JeQTc

//learn.microsoft.com/en-us/graph/outlook-change-notifications-overview

// validate validationtoken issuer, auidence, lifetime, signing key(remaining)
// decode datakey - done
// decoded datakey + my cert private key and RSA decrypt = symmetric key -done

// const dummyValue = {
//   subscriptionId: "da01f595-e793-4b55-8ad4-4eae46f1b57f",
//   subscriptionExpirationDateTime: "2024-06-20T11:00:00+00:00",
//   changeType: "created",
//   resource:
//     "Users('00034001-74b7-a02c-0000-000000000000')/messages('AQMkADAwATM0MDAAMS03NGI3LWEwMmMtMDACLTAwCgBGAAADhBNuA9p0M0qctGQaCD3RRQcAPFDYESkv3k24UNcyzmFJagAAAgEMAAAAPFDYESkv3k24UNcyzmFJagAAAARSpl4AAAA=')",
//   clientState: "SecretClientState",
//   tenantId: "84df9e7f-e9f6-40af-b435-aaaaaaaaaaaa",
//   encryptedContent: {
//     data: "SQDtqrZ3K83+qCH1yRrG3SvfqImyFwjBIs5nCKZIY7pXr+YFzWl0RbxOJRFBrs7Blx2BNdWmcjw4E8ZoQzfixK+SwGrJrDZeHlM2xnzYbY1SXI50pwVZKDaJoHuV8DYx11X8fT/S1Y3B5u4YJqfXMes/uRL8qgZk0F055D0NzaY1jTsD+IenhgIfkjesVt0k9IfXoSMFmqZywb/Q4qQHXV3b2Z8cl3FPRv8ALEF4g0rCCQIArKtMx6rNyscv04jl45Wfkh94Wz1l4G1Z5eMB4gf0OYbcgXMcjw4oUFgRDZjM/5gx+S+SORiOzf4Z1eUSggm+aGm/lZkRY9FvZ/viEkzXUDZkHlID9oU6i7t5a19eQTefv4RwZASfGwBcb6fgZ18b6gSWdPVNPBENe6bMhBLNfZJCiuTYLWMD/JMiMisbJGGCIyQ44MvwZXXEsIA/b8a4KYPqJan+vhFnTE9mrjk6MDwr7LyhmrwEKlsKF45X2sQj5NnClWV8eoJRbSd7/vqC+sw2BtkEzGPy+BaLk2fU9ZNzB6ZNUcpEjkkrVHs=",
//     dataKey:
//       "IRNQ8MHNJfHkizyH3NMTp6evv46DMA0yfUhnM6lVIp9DcHtp00e8FlVPXYrnKN+cXJyJyEylsw5UHOEh+w9hr8NcFwMuBw76fATL7IZ8AObRjFulLpl0CAUvCB+ViKM43RSdDKTM7ZOMu2eAK7+JN6f+d0S46kuF21Wqtlg1DSczJwnrlvc3ECQXlYsXbWUwBJTIHmpwSQVD+NUQTlk0ohRLIH9ieXtZXItygovfDGj2XJw/wE68Cx6QXUJOC202n894c23IyPTEHo7B1WT41OrVtwG92QCr25pRGP0eCnqwDu7jf4zpmMqEWKqH1uGS/uSaquSJctdN+YqL26YyQw==",
//     dataSignature: "hMgKuyrMgH5YkBtsz4Jct2nzdvzAZZ79enimnYtje/c=",
//     encryptionCertificateId: "93a264cafa864ef39c2673f8ff258b21",
//     encryptionCertificateThumbprint:
//       "ABAB3B1CB288713212335F60B6086A063393111D",
//   },
//   resourceData: {
//     "@odata.type": "#microsoft.graph.message",
//     "@odata.id":
//       "Users('00034001-74b7-a02c-0000-000000000000')/messages('AQMkADAwATM0MDAAMS03NGI3LWEwMmMtMDACLTAwCgBGAAADhBNuA9p0M0qctGQaCD3RRQcAPFDYESkv3k24UNcyzmFJagAAAgEMAAAAPFDYESkv3k24UNcyzmFJagAAAARSpl4AAAA=')",
//     "@odata.etag": 'W/"CQAAABYAAAA8UNgRKS/eTbhQ1zLOYUlqAAAEUOLo"',
//     id: "AQMkADAwATM0MDAAMS03NGI3LWEwMmMtMDACLTAwCgBGAAADhBNuA9p0M0qctGQaCD3RRQcAPFDYESkv3k24UNcyzmFJagAAAgEMAAAAPFDYESkv3k24UNcyzmFJagAAAARSpl4AAAA=",
//   },
// };

// TODO:
// create local subscription in db
// access token renew
// subscription renew make cron timer which check subscription

// make required additional subscriptions and select fields (check pdf requrements)
// create mail messages with only required fields
// properly update with the change notifications

// setup https production webhook url for receiving notifications

// update db when notfication is received
// setup socket in frontend and backend
// emit socket when notification is received
// update frontend UI to handle emails
// change frontend data according to received notification using socket
// create logic for subscription deletion in backend when sign out
// elastic api key and keyid automatic
// api payloads validations

//create user 2 choti trigger vairaxa front end ma

app.post("/notification-client", async (req, res) => {
  const subscriptionDataValue = req.body?.value?.[0];

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
        username: req.query.username,
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
          new Date().getTime() + 5 * 60 * 1000
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

    const { value: mailMessages } = await azureGet({
      accessToken: accessToken,
      urlPart: "/me/messages?top=500",
    });

    const responseMails = mailMessages.map((mail) => {
      return {
        id: mail.id,
        isRead: mail.isRead,
        isDraft: mail.isDraft,
        subject: mail.subject,
        bodyPreview: mail.bodyPreview,
        sender: {
          name: mail.sender.emailAddress.name,
          email: mail.sender.emailAddress.address,
        },
        userId: mail.userId,
      };
    });

    await bulkInsertMessages({
      userId: me.id,
      mail: me.mail,
      mailMessages,
    });

    // await updateUserMailBox({
    //   userId: me.id,
    // });

    const createSubscription = async () => {
      const subscription: MicrosoftGraphSubscription = await azurePost({
        accessToken: accessToken,
        urlPart: "/subscriptions",
        data: {
          changeType: "created,updated",
          notificationUrl: `${process.env.WEBHOOK_BASE_URL}/notification-client?username=${me.userPrincipalName}`,
          // lifecycleNotificationUrl: `${process.env.WEBHOOK_BASE_URL}/lifecycle-notifications`,
          resource: `/users/${me.id}/messages?$select=Subject,bodyPreview,receivedDateTime,from,isRead,isDraft,id,importance`,
          includeResourceData: true,
          encryptionCertificate: process.env.CERT_PUBLIC_KEY,
          encryptionCertificateId: process.env.CERT_ID,
          expirationDateTime: new Date(
            new Date().getTime() + 200 * 60 * 1000
          ).toISOString(),
          clientState: process.env.SECRET_CLIENT_STATE,
        },
      });

      await createLocalSubscription({ ...subscription, userId: me.id });
    };

    const hasSubcriptionIndex = await esclient.indices.exists({
      index: "subscriptions",
    });

    if (!hasSubcriptionIndex) {
      await createSubscription();
      res.status(200).json({ data: responseMails });
      return;
    }

    const currentSubscriptions = await esclient.search({
      index: "subscriptions",
      query: {
        match: {
          userId: me.id,
        },
      },
    });

    if (!currentSubscriptions.hits?.hits?.length) {
      await createSubscription();
    }

    res.status(200).json({ data: responseMails });
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
