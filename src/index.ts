import express from "express";
import "dotenv/config";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer } from "http";
import { syncMail } from "./controllers/syncMail.controller";
import { lifecycleNotification } from "./controllers/lifecycleNotification.controller";
import { notificationClient } from "./controllers/notificatiionClient.controller";
import { initSockets } from "./services/socket";
import { deleteSubsQueue } from "./services/queues";

const SERVER_PORT = process.env.PORT || 3000;

const app = express();

const httpServer = createServer(app);

const { myEmitter } = initSockets(httpServer);

app.use(cors());
app.use(bodyParser.json());

// https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks?tabs=http
// https://learn.microsoft.com/en-us/graph/change-notifications-overview
// https://learn.microsoft.com/en-us/graph/change-notifications-lifecycle-events?tabs=http
// https://learn.microsoft.com/en-us/graph/api/resources/change-notifications-api-overview?view=graph-rest-1.0
// https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0&tabs=http

app.post(
  "/notification-client",
  async (req, res, next) => await notificationClient(req, res, next, myEmitter)
);

app.post("/lifecycle-notifications", lifecycleNotification);

app.post("/sync-mail", syncMail);

// app.post("/delete-subs/:userId", (req, res) => {
//   const { token } = req.headers;
//   const { userId } = req.params;
//   deleteSubsQueue.add("deleteSubsriptions", {
//     accessToken: token,
//     userId,
//   });

//   res.sendStatus(200);
// });

httpServer.listen(SERVER_PORT, () =>
  console.log(`app listening on port ${SERVER_PORT}!`)
);
