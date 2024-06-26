import { Client } from "@elastic/elasticsearch";
import { Mailboxes, MicrosoftGraphSubscription } from "../types";

export const esclient = new Client({
  node: process.env.ELASTIC_ENDPOINT,
  auth: {
    username: process.env.ELASTIC_USERNAME,
    password: process.env.ELASTIC_PASSWORD,
  },
});

export const createMailBox = async ({
  userId,
  emailAddress,
  accessToken,
}: {
  userId: string;
  emailAddress: string;
  accessToken: string;
}) => {
  try {
    return await esclient.index({
      index: "mailboxes",
      id: userId,
      body: {
        emailAddress: emailAddress,
        userId: userId,
        accessToken: accessToken,
        syncStatus: "outdated",
        lastSyncTime: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("Error createMailBox:", e);

    throw e;
  }
};

export const bulkInsertMessages = async ({
  userId,
  mail,
  mailMessages,
  mailFolderId,
  mailFolderName,
}) => {
  const operationsForBulk = mailMessages.flatMap((email) => [
    { index: { _index: "email_messages", _id: email.id } },
    {
      ...email,
      userId,
      primaryEmail: mail,
      mailFolderId,
      mailFolderName,
    },
  ]);
  try {
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
  } catch (e) {
    console.error("Error bulkInsertMessages:", e);
    throw e;
  }
};

export const bulkInsertMailfolders = async ({ userId, mail, mailFolders }) => {
  const operationsForBulk = mailFolders.flatMap((folder) => [
    { index: { _index: "mail_folders", _id: folder.id } },
    {
      ...folder,
      userId,
      primaryEmail: mail,
    },
  ]);
  try {
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
  } catch (e) {
    console.error("Error bulkInsertMailfolders:", e);
    throw e;
  }
};

export const getUserMailBox = async ({ userId }) => {
  try {
    const data = await esclient.get({
      index: "mailboxes",
      id: userId,
    });
    return data as { _source: Mailboxes };
  } catch (e) {
    console.error("Error getUserMailBox:", e);
    throw e;
  }
};

export const createLocalSubscription = async (
  subscription: MicrosoftGraphSubscription & {
    userId: string;
    mailFolderId: string;
  }
) => {
  try {
    return await esclient.index({
      index: "subscriptions",
      id: subscription.id,
      body: subscription,
    });
  } catch (e) {
    console.error("Error local subscription:", e);

    throw e;
  }
};

export const hasElasticIndex = async (indexName: string) => {
  try {
    return await esclient.indices.exists({
      index: indexName,
    });
  } catch (e) {
    console.log(e.message);
    throw e;
  }
};

export const userSubscriptions = async ({
  userId,
  mailFolderId,
}: {
  userId: string;
  mailFolderId: string;
}) => {
  try {
    return await esclient.search({
      index: "subscriptions",
      query: {
        bool: {
          must: [{ match: { userId } }, { match: { mailFolderId } }],
        },
      },
    });
  } catch (e) {
    console.log(e.message);
  }
};
