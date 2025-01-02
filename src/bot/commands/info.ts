import { hardCleanUpBotMessage } from "@/utils/bot";
import { formatM2Number } from "@/utils/general";
import { sleep } from "@/utils/time";
import {
  getFirstBuyers,
  getTokenDetails,
  getTopTraders,
  shortenEthAddress,
  TokenDetails,
} from "@/utils/web3";
import { userState } from "@/vars/state";
import { CommandContext, Context } from "grammy";

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

  const msg = await ctx.reply("Getting token data...");
  await ctx.replyWithChatAction("typing");

  const [firstBuyers, topHolders] = await Promise.all([
    getFirstBuyers(token),
    getTopTraders(token as string),
  ]);

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

  await ctx.deleteMessages([msg.message_id]);
  ctx.reply(firstBuyersText, {
    parse_mode: "MarkdownV2",
    // @ts-expect-error Param not found
    disable_web_page_preview: true,
  });

  await sleep(1000);

  let topHoldersText = `Top 50 most profitable traders of ${tokenDetails.symbol}:\n\n`;
  for (const [index, balance] of topHolders.slice(0, 50).entries()) {
    const { address, pnl } = balance;
    topHoldersText += `${index + 1}\\. [${hardCleanUpBotMessage(
      shortenEthAddress(address)
    )}](https://etherscan.io/address/${address}) \\- $${formatM2Number(pnl)}\n`;
  }

  ctx.reply(topHoldersText, {
    parse_mode: "MarkdownV2",
    // @ts-expect-error Param not found
    disable_web_page_preview: true,
  });

  delete userState[ctx.chatId];
}
