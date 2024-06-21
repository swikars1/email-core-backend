// import { CronJob } from "cron";
// import { azurePatch } from "./azureGraph";
// import {
//   MicrosoftGraphSubscription,
//   esclient,
//   getUserMailBox,
// } from "./elastic";

// export async function renewSubscription({
//   userId,
//   subscriptionId,
// }: {
//   userId: string;
//   subscriptionId: string;
// }) {
//   const user: any = await getUserMailBox({
//     userId,
//   });

//   await azurePatch({
//     accessToken: user._source.access_token,
//     urlPart: `subscriptions/${subscriptionId}`,
//     data: {
//       // add 4000 minutes to current time
//       expirationDateTime: new Date(
//         new Date().getTime() + 4 * 60 * 1000
//       ).toISOString(),
//     },
//   });
// }

// // fix this expire logic
// export async function checkExpiredSubscriptions() {
//   const allSubscriptions = await esclient.search({
//     index: "subscriptions",
//   });
//   // get subscriptions that are about to expire

//   const allSubscriptionsHits: any = allSubscriptions.hits.hits;

//   const now = new Date();
//   for (const subscription of allSubscriptionsHits) {
//     const expirationTime = new Date(subscription._source.expirationDateTime);
//     if (expirationTime.getTime() < now.getTime()) {
//       const user: any = await getUserMailBox({
//         userId: subscription._source.userId,
//       });
//       await azurePatch({
//         accessToken: user._source.access_token,
//         urlPart: `subscriptions/${subscription._source.subscriptionId}`,
//         data: {
//           expirationDateTime: new Date(
//             now.getTime() + 4 * 60 * 1000
//           ).toISOString(),
//         },
//       });
//     }
//   }
// }

// const job = CronJob.from({
//   cronTime: "* * * * * *",
//   onTick: function () {
//     console.log("You will see this message every second");
//   },
//   start: true,
//   timeZone: "America/Los_Angeles",
// });
