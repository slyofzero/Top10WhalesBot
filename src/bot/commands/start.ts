import { teleBot } from "@/index";
import { CommandContext, Context } from "grammy";

export async function startBot(ctx: CommandContext<Context>) {
  const { username } = await teleBot.api.getMe();
  const text = `*Welcome to ${username}\\!\\!\\!*\n\n`;
  ctx.reply(text, { parse_mode: "MarkdownV2" });
}
