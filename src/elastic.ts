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

export const createMailBoxDoc = async ({
  accountId,
  emailAddress,
  accessToken,
}: {
  accountId: string;
  emailAddress: string;
  accessToken: string;
}) => {
  return await esclient.index({
    index: "mailboxes",
    id: accountId,
    body: {
      email_address: emailAddress,
      account_id: accountId,
      access_token: accessToken,
      sync_status: "outdated",
      last_sync_time: new Date().toISOString(),
    },
  });
};
