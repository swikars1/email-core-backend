import { Queue, Worker } from "bullmq";
import {
  MicrosoftGraphSubscription,
  createLocalSubscription,
  esclient,
} from "./elastic";
import { azureDelete, azurePost } from "../utils/azureGraph";
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
    userId: job.data?.me?.id,
  });
});

export const deleteSubsQueue = new Queue("deleteSubsQueue", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

const deleteSubsWorker = new Worker(
  "deleteSubsQueue",
  async (job) => {
    const subscriptionByUserId = await esclient.search({
      index: "subscriptions",
      query: {
        match: {
          userId: job.data?.userId,
        },
      },
    });

    const data = subscriptionByUserId.hits.hits;

    await esclient.deleteByQuery({
      index: "subscriptions",
      query: {
        match: {
          userId: job.data?.userId,
        },
      },
    });

    for (let i = 0; i < data?.length; i++) {
      const subscription: any = data[i]._source;
      await azureDelete({
        accessToken: job.data.accessToken,
        urlPart: `/subscriptions/${subscription.id}`,
      });
    }
  },
  { connection: redisClient }
);

deleteSubsWorker.on("completed", (job) => {
  console.log(`${job.id} has completed! - deleteSubsWorker`);
});

deleteSubsWorker.on("failed", (job, err) => {
  console.log(`${job.id} has failed with ${err.message} - deleteSubsWorker`, {
    mailfolderId: job.data?.mailFolder?.id,
    userId: job.data?.me?.id,
  });
});
