import { CallbackQueryContext, CommandContext, Context } from "grammy";
import { errorHandler, log } from "@/utils/handlers";
import { userState } from "@/vars/state";
import { infoStep, paginateTopTraders } from "./commands/info";

const steps: { [key: string]: any } = {
  info: infoStep,
  tt: paginateTopTraders,
};

const requestIds: { [key: number]: any } = {
  0: () => null,
};

export async function executeStep(
  ctx: CommandContext<Context> | CallbackQueryContext<Context>
) {
  try {
    const request_id = ctx.update.message?.chat_shared?.request_id || 0;
    requestIds[request_id](ctx);

    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply("Please redo your action");

    const queryCategory = ctx.callbackQuery?.data?.split("-").at(0);
    const step = userState[chatId] || queryCategory || "";
    const stepFunction = steps[step];

    if (stepFunction) {
      stepFunction(ctx);
    } else {
      log(`No step function for ${queryCategory} ${userState[chatId]}`);
    }
  } catch (error) {
    errorHandler(error);
  }
}
