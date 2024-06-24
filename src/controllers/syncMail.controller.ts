import { Request, Response } from "express";
import {
  createMailBox,
  bulkInsertMailfolders,
  bulkInsertMessages,
  hasElasticIndex,
  userSubscriptions,
} from "../services/elastic";
import { subsQueue } from "../services/queues";
import { azureGet } from "../utils/azureGraph";

export const syncMail = async (req: Request, res: Response) => {
  if (!req.headers?.token) {
    console.log("Token was not found in header");
    res.sendStatus(400);
    return;
  }

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

    const { value: mailFolders } = await azureGet({
      accessToken: accessToken,
      urlPart: "/me/mailFolders?top=10",
    });

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

      const hasSubcriptionIndex = await hasElasticIndex("subscriptions");

      if (!hasSubcriptionIndex) {
        await subsQueue.add("createSubscription", {
          subscriptionPayload,
          me,
          mailFolder,
        });
        continue;
      }

      const currentSubscriptions = await userSubscriptions({
        mailFolderId: mailFolder.id,
        userId: me.id,
      });

      if (!currentSubscriptions.hits?.hits?.length) {
        await subsQueue.add("createSubscription", {
          subscriptionPayload,
          me,
          mailFolder,
        });
      }
    }

    res.status(200).json({
      data: { responseMails: Object.fromEntries(mailFolderMap), mailFolders },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
