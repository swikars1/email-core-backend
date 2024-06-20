import express from "express";

import "dotenv/config";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { createMailBoxDoc, esclient } from "./elastic";
import bodyParser from "body-parser";
import { azureGet } from "./azureGraph";
import {
  decryptPayload,
  decryptRSAWithPrivateKey,
  verifySignature,
} from "./certHelper";

const SERVER_PORT = process.env.PORT || 3000;

const app = express();

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

app.post("/notification-client", async (req, res) => {
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

  const subscriptionDataValue = req.body?.value?.[0];

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
    }
    const finalPayload = decryptPayload(
      subscriptionDataValue.encryptedContent.data,
      symmetricKey
    );

    console.log({ finalPayload: JSON.parse(finalPayload) });
  }

  console.log({ body: JSON.stringify(req.body, null, 2) });

  // res.status(200).json({ data: "" });

  const validationToken = req.query.validationToken;

  if (validationToken) {
    console.log("Received validation request:", { validationToken });

    // Send the validation token back as plain text
    res.set("Content-Type", "text/plain");
    res.status(200).send(validationToken);
  } else {
    res.sendStatus(202);
    console.log("Invalid validation request (no token found)");
  }
});

app.post("/lifecycle-notifications", async (req, res) => {
  res.status(200).json({ data: "" });
});

app.post("/create-user", async (req, res) => {
  // todo: validate body params
  try {
    const data = await createMailBoxDoc({
      emailAddress: req.body.emailAddress,
      accountId: req.body.accountId,
      accessToken: req.body.accessToken,
    });

    const { value: mailMessages } = await azureGet({
      accessToken: req.body.accessToken,
      urlPart: "/me/messages?top=500",
    });

    console.log({ mailMessages: mailMessages.length });

    const operationsForBulk = mailMessages.flatMap((email) => [
      { index: { _index: "email_messages", _id: email.id } },
      {
        ...email,
        localAccountId: req.body.accountId,
        primaryEmail: req.body.emailAddress,
      },
    ]);
    const bulkResponse = await esclient.bulk({
      refresh: true,
      operations: operationsForBulk,
    });

    if (bulkResponse.errors) {
      const erroredDocuments = [];

      bulkResponse.items.forEach((action, i) => {
        const operation = Object.keys(action)[0];
        if (action[operation].error) {
          erroredDocuments.push({
            status: action[operation].status,
            error: action[operation].error,
            operation: operation[i * 2],
            document: operation[i * 2 + 1],
          });
        }
      });
      console.log(erroredDocuments);
    }

    await esclient.update({
      index: "mailboxes",
      id: req.body.accountId,
      body: {
        doc: {
          last_sync_time: new Date().toISOString(),
          sync_status: "updated",
        },
      },
    });

    res.status(200).json({ data: mailMessages });
  } catch (e) {
    res.status(500).json(e);
  }
});

app.listen(SERVER_PORT, () =>
  console.log(` app listening on port ${SERVER_PORT}!`)
);
