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

app.post(
  "/notification-client",
  async (req, res, next) => await notificationClient(req, res, next, myEmitter)
);

app.post("/lifecycle-notifications", lifecycleNotification);

app.post("/sync-mail", syncMail);

app.post("/del-sub/:userId", async (req, res) => {
  const { accessToken } = req.headers as {
    accessToken: string;
  };
  const { userId } = req.params;

  try {
    await deleteSubsQueue.add("deleteSubsriptions", {
      accessToken: accessToken,
      userId,
    });
    res.sendStatus(200);
    return;
  } catch (e) {
    res.sendStatus(401);
    return;
  }
});

httpServer.listen(SERVER_PORT, () =>
  console.log(`app listening on port ${SERVER_PORT}!`)
);
