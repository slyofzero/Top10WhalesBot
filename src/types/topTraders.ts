interface Trade {
  amount: number;
  txns: number;
}

export interface WalletData {
  address: string;
  trades_count: number;
  trades: number;
  pnl: number;
  pnl_x: number;
  sell: Trade;
  buy: Trade;
}

interface Result {
  status: string;
  wallets: WalletData[];
}

export interface TopTraders {
  id: string;
  result: Result;
  jsonrpc: string;
}
