import Web3, { Web3BaseProvider } from "web3";
import { ethers } from "ethers";
import { RegisteredSubscription } from "web3/lib/commonjs/eth.exports";
import { log } from "@/utils/handlers";
import { ETHERSCAN_API_KEY } from "@/utils/env";

const rpcUrl = `https://ethereum.blockpi.network/v1/rpc/public`;
const websocketURL = `wss://ethereum-rpc.publicnode.com`;

export let web3: Web3<RegisteredSubscription> | null = null;
export let wssProvider: Web3BaseProvider<unknown> | null = null;
export const provider = new ethers.JsonRpcProvider(rpcUrl);
export const etherscan = new ethers.EtherscanProvider(
  "mainnet",
  ETHERSCAN_API_KEY
);

export function configureWeb3() {
  wssProvider = new Web3.providers.WebsocketProvider(websocketURL);
  web3 = new Web3(wssProvider);
  log("Configured web3 and WSS provider");
}
