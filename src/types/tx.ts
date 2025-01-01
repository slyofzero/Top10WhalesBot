export interface Tx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

export interface EtherscanTx {
  status: "0" | "1";
  message: string;
  result: Tx[];
}

export interface TokenBuyData {
  txHash: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  timestamp: number;
}

export interface AccountBalance {
  address: string;
  balance: string;
  share: string;
}

export interface TokenHolders {
  holdersCount: number;
  topHolders: AccountBalance[];
}
