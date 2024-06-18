import Redis from "ioredis";

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || "",
};

export const redisClient = new Redis(redisConfig);

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

export async function getRedisValue(key: string) {
  try {
    const value = await redisClient.get(key);
    return value;
  } catch (err) {
    console.error("Error getting value:", err);
  }
}

export async function setRedisValue(key: string, value: any) {
  try {
    await redisClient.set(key, value);
  } catch (err) {
    console.error("Error setting value:", err);
  }
}
