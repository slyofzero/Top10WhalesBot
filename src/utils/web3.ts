import { etherscan, provider } from "@/ethWeb3";
import { ethers } from "ethers";
import { apiFetcher, apiPoster } from "./api";
import {
  AccountBalance,
  EtherscanTx,
  TokenBuyData,
  TokenHolders,
} from "@/types";
import { TopTraders } from "@/types/topTraders";

export interface TokenDetails {
  symbol: any;
  decimals: any;
  totalSupply: any;
}
export async function getTokenDetails(tokenAddress: string) {
  const tokenContract = new ethers.Contract(
    tokenAddress,
    [
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
    ],
    provider
  );

  const [symbol, decimals, totalSupply] = await Promise.all([
    tokenContract.symbol(),
    tokenContract.decimals(),
    tokenContract.totalSupply(),
  ]);

  return { symbol: symbol === "WETH" ? "ETH" : symbol, decimals, totalSupply };
}

export const pairContractAbi = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
];

export async function getAddressTxns(contractAddress: string, page?: number) {
  const url = etherscan.getUrl("account", {
    action: "tokentx",
    sort: "asc",
    page: String(page || 1),
    offset: "10",
    contractAddress,
  });

  console.log(url);
  const tokenTxs = await apiFetcher<EtherscanTx>(url);
  const txs = tokenTxs?.data.result || [];
  return txs;
}

export async function getFirstBuyers(token: string) {
  const txnHashs = new Set<string>();
  const tokenDetails = new Map<string, { symbol: string; decimals: number }>();
  const tokenBuys = new Map<string, TokenBuyData>();
  let page = 1;
  const totalSize = 10;

  mainLoop: while (tokenBuys.size <= totalSize && page <= 10) {
    const txns = await getAddressTxns(token, page);

    for (const txn of txns) {
      if (tokenBuys.size >= totalSize) break mainLoop;
      if (txnHashs.has(txn.hash)) continue;

      const receipt = await provider.getTransactionReceipt(txn.hash);
      const iface = new ethers.Interface(pairContractAbi);

      for (const log of receipt?.logs || []) {
        const event = iface.parseLog(log);
        if (!event || event.name.toLowerCase() !== "swap") continue;

        let to = "";
        if (event.signature.includes("int24")) {
          to = event.args.recipient;
        } else {
          to = event.args.to;
        }
        if (tokenBuys.has(to)) continue;

        const pairContract = new ethers.Contract(
          log.address,
          pairContractAbi,
          provider
        );
        const [token0, token1] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
        ]);

        if (!tokenDetails.has(token0)) {
          const token0Details = await getTokenDetails(token0);
          tokenDetails.set(token0, token0Details);
        }

        if (!tokenDetails.has(token1)) {
          const token1Details = await getTokenDetails(token1);
          tokenDetails.set(token1, token1Details);
        }

        const token0Details = tokenDetails.get(token0)!;
        const token1Details = tokenDetails.get(token1)!;

        if (!(token0 === token || token1 === token)) continue;

        if (event.signature.includes("int24")) {
          const { amount0, amount1 } = event.args;

          if (token0 === token && amount0 < 0) {
            const data = {
              txHash: txn.hash,
              tokenIn: token1Details.symbol,
              tokenOut: token0Details.symbol,
              amountIn: ethers.formatUnits(amount1, token1Details.decimals),
              amountOut: ethers.formatUnits(BigInt(-1) * amount0, token0Details.decimals), // prettier-ignore
              timestamp: Number(txn.timeStamp) * 1000,
            };

            tokenBuys.set(to, data);
          } else if (token1 === token && amount1 < 0) {
            const data = {
              txHash: txn.hash,
              tokenIn: token0Details.symbol,
              tokenOut: token1Details.symbol,
              amountIn: ethers.formatUnits(amount0, token0Details.decimals),
              amountOut: ethers.formatUnits(BigInt(-1) * amount1, token1Details.decimals), // prettier-ignore
              timestamp: Number(txn.timeStamp) * 1000,
            };

            tokenBuys.set(to, data);
          }
        } else {
          const { amount0In, amount1In, amount0Out, amount1Out } = event.args;

          if (!(token0 === token || token1 === token)) continue;

          let amountIn = ethers.formatUnits(amount1In, token1Details.decimals);
          let amountOut = ethers.formatUnits(
            amount0Out,
            token0Details.decimals
          );
          let tokenIn = token1Details.symbol;
          let tokenOut = token0Details.symbol;

          if (token1 === token) {
            amountIn = ethers.formatUnits(amount0In, token1Details.decimals);
            amountOut = ethers.formatUnits(amount1Out, token0Details.decimals);
            tokenIn = token0Details.symbol;
            tokenOut = token1Details.symbol;
          }

          const data = {
            txHash: txn.hash,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            timestamp: Number(txn.timeStamp) * 1000,
          };
          tokenBuys.set(to, data);
        }
      }

      txnHashs.add(txn.hash);
    }
    page++;
    console.log(tokenBuys.size);
  }

  return tokenBuys;
}

export async function getTopTraders(token: string) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "collections@getAnalytics",
    params: {
      mode: "top",
      chain: "ethereum",
      token: token,
      tokens: [],
      sort: "pnl",
      sortType: "desc",
    },
  };
  const { data } = await apiPoster<TopTraders>(
    "https://api.dexwhales.xyz/api/v0/collections/rpc",
    body
  );

  return data.result.wallets;
}

export async function getTokenHolders(token: string): Promise<TokenHolders> {
  const { totalSupply, decimals } = await getTokenDetails(token);
  const formattedTotalSupply = parseFloat(
    ethers.formatUnits(totalSupply, decimals)
  );

  const tokenHoldersBody = {
    id: 1,
    jsonrpc: "2.0",
    method: "nr_getTokenHolders",
    params: [token, "0xA", "", "0xA"],
  };

  const tokenHoldersCountBody = {
    id: 1,
    jsonrpc: "2.0",
    method: "nr_getTokenHolderCount",
    params: [token],
  };

  const topHoldersPromise = fetch(
    "https://eth-mainnet.nodereal.io/v1/f3b37cc49d3948f5827621b8c2e0bdb3",
    { method: "POST", body: JSON.stringify(tokenHoldersBody) }
  );

  const holdersCountPromise = fetch(
    "https://eth-mainnet.nodereal.io/v1/f3b37cc49d3948f5827621b8c2e0bdb3",
    { method: "POST", body: JSON.stringify(tokenHoldersCountBody) }
  );

  const [topHolders, tokenHolders] = await Promise.all([
    topHoldersPromise,
    holdersCountPromise,
  ]);
  const [topHoldersJson, tokenHoldersJson] = await Promise.all([
    topHolders.json(),
    tokenHolders.json(),
  ]);
  const holdersCount = Number(tokenHoldersJson?.result?.result || 0);

  const holders: AccountBalance[] = [];
  for (const holder of topHoldersJson?.result?.details || []) {
    const tokenBalance = parseFloat(
      parseFloat(ethers.formatUnits(holder.tokenBalance, decimals)).toFixed(2)
    );
    const share = ((tokenBalance / formattedTotalSupply) * 100).toFixed(2);
    holders.push({
      address: String(holder.accountAddress),
      balance: String(tokenBalance),
      share,
    });
  }

  return { holdersCount, topHolders: holders };
}

export function shortenEthAddress(address: string, show: number = 3) {
  return `${address.slice(0, show)}...${address.slice(
    address.length - show,
    address.length
  )}`;
}
