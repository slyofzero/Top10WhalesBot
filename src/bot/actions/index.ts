import { teleBot } from "@/index";
import { log } from "@/utils/handlers";
import { executeStep } from "../executeStep";

export function initiateCallbackQueries() {
  // @ts-expect-error Weird type at hand
  teleBot.on("callback_query:data", (ctx) => executeStep(ctx));

  log("Bot callback queries up");
}
