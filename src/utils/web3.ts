import { etherscan, provider } from "@/ethWeb3";
import { ethers } from "ethers";
import { apiFetcher } from "./api";
import { EtherscanTx, SwapTxnData, Tx } from "@/types";
import { userTxns } from "@/vars/txns";
import { users } from "@/vars/users";
import { log } from "./handlers";

export async function getTokenDetails(tokenAddress: string) {
  const tokenContract = new ethers.Contract(
    tokenAddress,
    [
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
    ],
    provider
  );

  const [symbol, decimals] = await Promise.all([
    tokenContract.symbol(),
    tokenContract.decimals(),
  ]);

  return { symbol: symbol === "WETH" ? "ETH" : symbol, decimals };
}

const pairContractAbi = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
];

export async function getAddressTxns(contractAddress: string, page?: number) {
  const url = etherscan.getUrl("account", {
    action: "tokentx",
    sort: "asc",
    page: String(page || 1),
    offset: "20",
    contractAddress,
  });

  const tokenTxs = await apiFetcher<EtherscanTx>(url);
  const txs = tokenTxs?.data.result || [];
  return txs;
}

export async function getSwapData(tx: Tx): Promise<SwapTxnData | false> {
  const receipt = await provider.getTransactionReceipt(tx.hash);
  const iface = new ethers.Interface(pairContractAbi);

  for (const log of receipt?.logs || []) {
    const event = iface.parseLog(log);
    if (!event) continue;
    const { amount0In, amount1In, amount0Out, amount1Out } = event.args;

    const pairContract = new ethers.Contract(
      log.address,
      pairContractAbi,
      provider
    );
    const [token0, token1] = await Promise.all([
      pairContract.token0(),
      pairContract.token1(),
    ]);
    const [token0Details, token1Details] = await Promise.all([
      getTokenDetails(token0),
      getTokenDetails(token1),
    ]);

    let amountIn = ethers.formatUnits(amount1In, token1Details.decimals);
    let amountOut = ethers.formatUnits(amount0Out, token0Details.decimals);
    let tokenIn = token1Details.symbol;
    let tokenOut = token0Details.symbol;

    if (amount0In && amount1Out) {
      amountIn = ethers.formatUnits(amount0In, token0Details.decimals);
      amountOut = ethers.formatUnits(amount1Out, token1Details.decimals);
      tokenIn = token0Details.symbol;
      tokenOut = token1Details.symbol;
    }

    const data: SwapTxnData = {
      txHash: tx.hash,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      action: tokenIn === "ETH" ? "buy" : tokenOut === "ETH" ? "sell" : "swap",
      timestamp: Number(tx.timeStamp) * 1000,
    };

    return data;
  }

  return false;
}

export async function processProfileTxns() {
  log("Processing profile transactions...");

  for (const user of users) {
    const { username, wallets } = user;

    const txns = await Promise.all(wallets.map(getAddressTxns));
    const swaps = (
      await Promise.all(
        txns.map(async (txs, index) => {
          const address = wallets[index];
          return await Promise.all(
            txs.map(async (tx) => {
              const swapData = await getSwapData(tx);
              if (swapData) {
                return { ...swapData, address };
              }
              return false;
            })
          );
        })
      )
    )
      .flat()
      .filter((tx): tx is SwapTxnData & { address: string } => Boolean(tx))
      .sort((a, b) => b.timestamp - a.timestamp);

    userTxns[username] = swaps;
  }

  log("Profile transactions processed ✅");
}
