import { Bot } from "grammy";
import { configureWeb3 } from "./ethWeb3";
import { log } from "./utils/handlers";
import { BOT_TOKEN } from "./utils/env";
import { initiateBotCommands } from "./bot/commands";
import { initiateCallbackQueries } from "./bot/actions";

export const teleBot = new Bot(BOT_TOKEN || "");
log("Bot instance ready");

(async function () {
  configureWeb3();
  teleBot.start();
  log("Telegram bot setup");
  initiateBotCommands();
  initiateCallbackQueries();
})();
