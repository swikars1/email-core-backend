import { Client } from "@elastic/elasticsearch";

export const esclient = new Client({
  node: process.env.ELASTIC_ENDPOINT,
  auth: {
    apiKey: {
      id: process.env.ELASTIC_API_KEY_ID,
      api_key: process.env.ELASTIC_API_KEY,
    },
  },
});

export const indexEmailMessages = async () => {
  await esclient.indices.create({
    index: "email_messages",
    mappings: {
      properties: {
        "@odata": {
          properties: {
            etag: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword",
                  ignore_above: 256,
                },
              },
            },
          },
        },
        body: {
          properties: {
            content: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword",
                  ignore_above: 256,
                },
              },
            },
            contentType: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword",
                  ignore_above: 256,
                },
              },
            },
          },
        },
        bodyPreview: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        changeKey: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        conversationId: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        conversationIndex: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        createdDateTime: {
          type: "date",
        },
        flag: {
          properties: {
            flagStatus: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword",
                  ignore_above: 256,
                },
              },
            },
          },
        },
        from: {
          properties: {
            emailAddress: {
              properties: {
                address: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256,
                    },
                  },
                },
                name: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256,
                    },
                  },
                },
              },
            },
          },
        },
        hasAttachments: {
          type: "boolean",
        },
        id: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        importance: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        inferenceClassification: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        internetMessageId: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        isDraft: {
          type: "boolean",
        },
        isRead: {
          type: "boolean",
        },
        isReadReceiptRequested: {
          type: "boolean",
        },
        lastModifiedDateTime: {
          type: "date",
        },
        localAccountId: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        parentFolderId: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        primaryEmail: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        receivedDateTime: {
          type: "date",
        },
        sender: {
          properties: {
            emailAddress: {
              properties: {
                address: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256,
                    },
                  },
                },
                name: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256,
                    },
                  },
                },
              },
            },
          },
        },
        sentDateTime: {
          type: "date",
        },
        subject: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
        toRecipients: {
          properties: {
            emailAddress: {
              properties: {
                address: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256,
                    },
                  },
                },
                name: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256,
                    },
                  },
                },
              },
            },
          },
        },
        webLink: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              ignore_above: 256,
            },
          },
        },
      },
    },
  });
};

export const indexMailBoxes = async () => {
  await esclient.indices.create({
    index: "mailboxes",
    mappings: {
      properties: {
        email_address: { type: "keyword" },
        account_id: { type: "keyword" },
        access_token: { type: "text" },
        refresh_token: { type: "text" },
        sync_status: { type: "keyword" },
        last_sync_time: { type: "date" },
      },
    },
  });
};

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

export const bulkInsertMessages = async ({ userId, mail, mailMessages }) => {
  const operationsForBulk = mailMessages.flatMap((email) => [
    { index: { _index: "email_messages", _id: email.id } },
    {
      ...email,
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
    console.error("Error bulkInsertMessages:", e);
    throw e;
  }
};

export const updateUserMailBox = async ({ userId }) => {
  try {
    await esclient.update({
      index: "mailboxes",
      id: userId,
      body: {
        doc: {
          last_sync_time: new Date().toISOString(),
          sync_status: "updated",
        },
      },
    });
  } catch (e) {
    console.error("updateUserMailBox", e);
    throw e;
  }
};

export const getUserMailBox = async ({ userId }) => {
  await esclient.get({
    index: "mailboxes",
    id: userId, // not sure if this comes
  });
};

export interface MicrosoftGraphSubscription {
  "@odata.context": string;
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  notificationQueryOptions: null | string; // Allowing for potential non-null values
  lifecycleNotificationUrl: string;
  expirationDateTime: string; // ISO 8601 date string
  creatorId: string;
  includeResourceData: boolean;
  latestSupportedTlsVersion: string;
  encryptionCertificate: string;
  encryptionCertificateId: string;
  notificationUrlAppId: null | string; // Allowing for potential non-null values
}

export const createLocalSubscription = async (
  subscription: MicrosoftGraphSubscription & { userId: string }
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
