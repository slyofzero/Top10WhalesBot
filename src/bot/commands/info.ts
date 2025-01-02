import { hardCleanUpBotMessage } from "@/utils/bot";
import { formatM2Number } from "@/utils/general";
import {
  getFirstBuyers,
  getTokenDetails,
  getTopTraders,
  shortenEthAddress,
  TokenDetails,
} from "@/utils/web3";
import { topTraders } from "@/vars/info";
import { userState } from "@/vars/state";
import {
  CallbackQueryContext,
  CommandContext,
  Context,
  InlineKeyboard,
} from "grammy";

export async function infoCommand(ctx: CommandContext<Context>) {
  const text = "Which ETH token would you like to know more about?";
  userState[ctx.chatId] = "info";
  ctx.reply(text);
}

export async function infoStep(ctx: CommandContext<Context>) {
  const token = ctx.message?.text;

  if (!token) {
    return ctx.reply("Please provide a valid token address");
  }

  let tokenDetails = {} as unknown as TokenDetails;

  try {
    tokenDetails = await getTokenDetails(token as string);
  } catch (error) {
    return ctx.reply("Please provide a valid token address");
  }

  const tradersMsg = await ctx.reply("Getting top traders data...");
  const firstBuyersMsg = await ctx.reply("Getting firstBuyers data...");
  await ctx.replyWithChatAction("typing");

  getFirstBuyers(token).then(async (firstBuyers) => {
    await ctx.deleteMessages([firstBuyersMsg.message_id]);

    let firstBuyersText = `First 10 buyers of ${tokenDetails.symbol}:\n\n`;
    for (const [index, [buyer, buyData]] of Array.from(
      firstBuyers.entries()
    ).entries()) {
      const { amountOut, amountIn, tokenOut, tokenIn } = buyData;
      const amountBought = hardCleanUpBotMessage(parseFloat(parseFloat(amountOut).toFixed(2))); // prettier-ignore
      const boughtFor = hardCleanUpBotMessage(parseFloat(parseFloat(amountIn).toFixed(3))); // prettier-ignore

      firstBuyersText += `${index + 1}\\. [${hardCleanUpBotMessage(shortenEthAddress(buyer))}](https://etherscan.io/address/${buyer})
      \t\t\t\t\\(${amountBought} ${hardCleanUpBotMessage(tokenOut)} for ${boughtFor} ${hardCleanUpBotMessage(tokenIn)}\\)\n`; // prettier-ignore
    }

    await ctx.reply(firstBuyersText, {
      parse_mode: "MarkdownV2",
      // @ts-expect-error Param not found
      disable_web_page_preview: true,
    });
  });

  getTopTraders(token as string).then(async (topHolders) => {
    await ctx.deleteMessages([tradersMsg.message_id]);
    if (topHolders) displayTopTraders(ctx, token, 1);
  });

  delete userState[ctx.chatId];
}

export async function paginateTopTraders(ctx: CallbackQueryContext<Context>) {
  const [, type, token, page] = ctx.callbackQuery.data.split("-");
  const currentPage = Number(page);
  const nextPage = type === "nx" ? currentPage + 1 : currentPage - 1;
  await ctx.deleteMessage();
  displayTopTraders(ctx, token, nextPage);
}

export async function displayTopTraders(
  ctx: CommandContext<Context> | CallbackQueryContext<Context>,
  token: string,
  page: number
) {
  const pageSize = 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const topHolders = topTraders[token]?.slice(start, end);

  if (!topHolders.length) {
    return ctx.reply("Please do /info.");
  }

  const totalPages = Math.ceil(topTraders[token].length / pageSize);

  const { symbol } = await getTokenDetails(token as string);

  let topHoldersText = `Top 50 most profitable traders of ${symbol}:\n\n`;
  for (const [index, balance] of topHolders.entries()) {
    const rank = start + index + 1;
    const { address, pnl } = balance;
    topHoldersText += `${rank}\\. [${hardCleanUpBotMessage(
      shortenEthAddress(address)
    )}](https://etherscan.io/address/${address}) \\- $${formatM2Number(pnl)}\n`;
  }
  topHoldersText += `\nPage ${page} of ${totalPages}`;

  let keyboard = new InlineKeyboard();

  if (page > 1) {
    keyboard = keyboard.text("⬅️ Prev", `tt-pv-${token}-${page}`);
  }
  if (page < 5) {
    keyboard = keyboard.text("Next ➡️", `tt-nx-${token}-${page}`);
  }

  await ctx.reply(topHoldersText, {
    parse_mode: "MarkdownV2",
    // @ts-expect-error Param not found
    disable_web_page_preview: true,
    reply_markup: keyboard,
  });
}
