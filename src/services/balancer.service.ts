import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  BalancerSdkConfig,
  Network,
} from '@defiverse/balancer-sdk';
import { ethers } from 'ethers';
import CONFIG from '@/services/config';
import { NETWORKS } from '@/constants/networks.constant';

const network  = NETWORKS[CONFIG.NETWORK];

const config: BalancerSdkConfig = {
  network: network.CHAIN_ID,
  rpcUrl: network.RPC_URL,
};

export const balancerVault = CONFIG.VAULT;

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
