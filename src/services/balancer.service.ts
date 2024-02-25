import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  BalancerSdkConfig,
  Network,
} from '@balancer-labs/sdk';
import { ethers } from 'ethers';
import CONFIG from './config';

const config: BalancerSdkConfig = {
  network: Network.SEPOLIA,
  rpcUrl: `https://sepolia.infura.io/v3/${CONFIG.INFURA}`,
};

export const balancerVault = CONFIG.VAULT;

// const config: BalancerSdkConfig = {
//   network: Network.MAINNET,
//   rpcUrl: 'http://127.0.0.1:8545',
// };

export const balancer = new BalancerSDK(config);
export const signer = new ethers.Wallet(
  CONFIG.SIGNER_PRIVATE_KEY,
  balancer.provider,
);
export const signerAddress = CONFIG.SIGNER_ADDRESS;

export const getPoolByPoolId = async (poolId: string) => {
  const pool = await balancer.pools.find(poolId);
  if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  return pool;
};
