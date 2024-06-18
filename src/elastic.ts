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
        "@odata.etag": { type: "keyword" },
        id: { type: "keyword" },
        createdDateTime: { type: "date" },
        lastModifiedDateTime: { type: "date" },
        changeKey: { type: "keyword" },
        categories: { type: "keyword" },
        receivedDateTime: { type: "date" },
        sentDateTime: { type: "date" },
        hasAttachments: { type: "boolean" },
        internetMessageId: { type: "keyword" },
        subject: { type: "text" },
        bodyPreview: { type: "text" },
        importance: { type: "keyword" },
        parentFolderId: { type: "keyword" },
        conversationId: { type: "keyword" },
        conversationIndex: { type: "keyword" },
        isDeliveryReceiptRequested: { type: "boolean" },
        isReadReceiptRequested: { type: "boolean" },
        isRead: { type: "boolean" },
        isDraft: { type: "boolean" },
        webLink: { type: "keyword" },
        inferenceClassification: { type: "keyword" },
        body: {
          properties: {
            contentType: { type: "keyword" },
            content: { type: "text" },
          },
        },
        sender: {
          properties: {
            emailAddress: {
              properties: {
                name: { type: "text" },
                address: { type: "keyword" },
              },
            },
          },
        },
        from: {
          properties: {
            emailAddress: {
              properties: {
                name: { type: "text" },
                address: { type: "keyword" },
              },
            },
          },
        },
        toRecipients: {
          type: "nested",
          properties: {
            emailAddress: {
              properties: {
                name: { type: "text" },
                address: { type: "keyword" },
              },
            },
          },
        },
        flag: {
          properties: {
            flagStatus: { type: "keyword" },
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
