import { Request, Response } from "express";

import EventEmitter from "events";
import {
  decryptPayload,
  decryptRSAWithPrivateKey,
  verifySignature,
} from "../utils/certHelper";

export const notificationClient = async (
  req: Request,
  res: Response,
  _,
  myEmitter: EventEmitter
) => {
  const subscriptionDataValue = req.body?.value?.[0];

  const mailFolderId = req.query?.mailFolderId;
  const username = req.query?.username;

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

    console.log({
      finalPayload: JSON.parse(finalPayload),
      body: JSON.stringify(req.body, null, 2),
    });

    if (subscriptionDataValue.resourceData.id && finalPayload) {
      myEmitter.emit("newMailEvent", {
        id: subscriptionDataValue.resourceData.id,
        changeType: subscriptionDataValue.changeType,
        username,
        mailFolderId,
        ...JSON.parse(finalPayload),
      });
    }
  }

  const validationToken = req.query.validationToken;

  if (validationToken) {
    res.set("Content-Type", "text/plain");
    res.status(200).send(validationToken);
  } else {
    res.sendStatus(202);
    console.log("Validation request has no validation token.");
  }
};
