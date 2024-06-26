import { Request, Response } from "express";
import { getUserMailBox } from "../services/elastic";
import { azurePatch } from "../utils/azureGraph";

export const lifecycleNotification = async (req: Request, res: Response) => {
  console.log("lifecycle-notifications", {
    body: JSON.stringify(req.body, null, 2),
  });
  console.log("lifecycle-notifications", {
    query: JSON.stringify(req.query, null, 2),
  });

  const validationToken = req.query.validationToken;

  if (validationToken) {
    res.set("Content-Type", "text/plain");
    res.status(200).send(validationToken);
    return;
  }

  const lifecycleEventValue = req.body?.value?.[0];

  if (lifecycleEventValue?.clientState !== process.env.SECRET_CLIENT_STATE) {
    res.sendStatus(202);
    console.log("secret client state didnt match !!");
    return;
  }

  if (lifecycleEventValue?.lifecycleEvent === "reauthorizationRequired") {
    const user = await getUserMailBox({
      userId: req.query.user_id,
    });

    await azurePatch({
      accessToken: user._source.accessToken,
      urlPart: `subscriptions/${lifecycleEventValue.subscriptionId}`,
      data: {
        // add 4000 minutes to current time
        expirationDateTime: new Date(
          new Date().getTime() + 4000 * 60 * 1000
        ).toISOString(),
      },
    });
  }
  res.sendStatus(202);
  console.log("Validation request has no validation token.");
};
