declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      ETHERSCAN_API_KEY: string | undefined;
      BOT_TOKEN: string | undefined;
    }
  }
}

export {};
