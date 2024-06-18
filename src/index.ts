import express from "express";

import "dotenv/config";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { esclient } from "./elastic";
import bodyParser from "body-parser";

const SERVER_PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.post("/create-user", async (req, res) => {
  console.log("body", req.body);
  try {
    const data = await esclient.index({
      index: "mailboxes",
      id: req.body.accountId,
      body: {
        email_address: req.body.emailAddress,
        account_id: req.body.accountId,
        access_token: req.body.accessToken,
        sync_status: "outdated",
        last_sync_time: new Date().toISOString(),
      },
    });
    res.status(200).json({ data });
  } catch (e) {
    res.status(500).json(e);
  }
});

app.listen(SERVER_PORT, () =>
  console.log(` app listening on port ${SERVER_PORT}!`)
);
