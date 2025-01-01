import dotenv from "dotenv";

export const { NODE_ENV } = process.env;
dotenv.config({
  path: NODE_ENV === "development" ? ".env" : ".env.production",
});

export const { ETHERSCAN_API_KEY, PORT, FIREBASE_KEY, BOT_TOKEN } = process.env;
