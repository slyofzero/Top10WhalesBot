import { teleBot } from "@/index";
import { startBot } from "./start";
import { log } from "@/utils/handlers";
import { infoCommand } from "./info";
import { executeStep } from "../executeStep";
import { CommandContext, Context } from "grammy";

export function initiateBotCommands() {
  teleBot.api.setMyCommands([
    { command: "start", description: "Start the bot" },
    { command: "info", description: "To get info about a token" },
  ]);

  teleBot.command("start", (ctx) => startBot(ctx));
  teleBot.command("info", (ctx) => infoCommand(ctx));

  teleBot.on(["message"], (ctx) => {
    executeStep(ctx as CommandContext<Context>);
  });

  log("Bot commands up");
}
