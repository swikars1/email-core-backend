import { Queue, Worker } from "bullmq";
import { MicrosoftGraphSubscription, createLocalSubscription } from "./elastic";
import { azurePost } from "../utils/azureGraph";
import { redisClient } from "./redis";

export const subsQueue = new Queue("subsQueue", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

const worker = new Worker(
  "subsQueue",
  async (job) => {
    const subscription: MicrosoftGraphSubscription = await azurePost(
      job.data.subscriptionPayload
    );

    await createLocalSubscription({
      ...subscription,
      userId: job.data.me.id,
      mailFolderId: job.data.mailFolder.id,
    });
  },
  { connection: redisClient }
);

worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`, {
    mailfolderId: job.data?.mailFolder?.id,
    userId: job.data.me.id,
  });
});
