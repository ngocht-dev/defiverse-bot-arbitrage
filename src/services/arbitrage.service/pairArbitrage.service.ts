import { QuerySimpleFlashSwapResponse, Swaps } from '@balancer-labs/sdk';
import lockfile from 'lockfile';
import { configurationService, logger } from '..';
import { Arbitrage, PairPool } from './arbitrage';
import { balancer, getPoolByPoolId, signerAddress } from '../balancer.service';
import CONFIG from '../config';

class PairArbitrage extends Arbitrage {
  protected lockedFilePath: string = 'pair.arbitrage.lock';
  protected name: string = 'PairArbitrage';

  async handlePair(pair: PairPool) {
    try {
      await this.waitUntilUnlock();
      if (!this.flag) {
        return;
      }
      await lockfile.lockSync(this.lockedFilePath);

      const pool1 = await getPoolByPoolId(pair.poolIds[0]);
      const pool2 = await getPoolByPoolId(pair.poolIds[1]);
      const pool1Tokens = pool1.tokens;
      const pool2Tokens = pool2.tokens;
      for (const token1 of pool1Tokens) {
        for (const token2 of pool2Tokens) {
          const data = {
            flashLoanAmount: CONFIG.PAIR_ARBITRAGE.AMOUNT,
            poolIds: [pool1.id, pool2.id],
            assets: [token1.address, token2.address],
          };
          const profit = await this.getProfit(data);
          const config = await configurationService.getConfig();

          if (
            profit.isProfitable &&
            parseFloat(profit.profits[token1.address]) > config.minProfit
          ) {
            logger.info(
              `Expected: Pair ${token1.symbol}-${token2.symbol} has profit ${profit.profits[token1.address]}`,
            );
            const tx = await this.trade(data);
            if (tx) {
              await this.recordTransaction(
                `${token1.symbol}-${token2.symbol}`,
                profit.profits[token1.address],
                tx,
              );
            }
          }
        }
      }
    } catch (error) {
      logger.error(error, `${this.name}.handlePair`);
    } finally {
      await lockfile.unlockSync(this.lockedFilePath);
    }
  }

  getPairs(): Array<PairPool> {
    return CONFIG.PAIR_ARBITRAGE.PAIRS;
  }

  async getProfit({
    poolIds,
    assets,
    flashLoanAmount,
  }: {
    flashLoanAmount: string;
    poolIds: Array<string>;
    assets: Array<string>;
  }): Promise<QuerySimpleFlashSwapResponse> {
    try {
      const response = await balancer.swaps.querySimpleFlashSwap({
        flashLoanAmount,
        poolIds,
        assets,
      });
      return response;
    } catch (error) {
      // logger.error(error, `${this.name}.getProfit`);
      return {
        isProfitable: false,
        profits: {},
      };
    }
  }

  async trade({
    poolIds,
    assets,
    flashLoanAmount,
  }: {
    flashLoanAmount: string;
    poolIds: Array<string>;
    assets: Array<string>;
  }) {
    try {
      const encodeData = Swaps.encodeSimpleFlashSwap({
        flashLoanAmount,
        poolIds,
        assets,
        walletAddress: signerAddress,
      });

      const receipt = await this.sendTransaction(encodeData);
      return receipt.transactionHash;
    } catch (error) {
      logger.error(error, `${this.name}.trade`);
      return null;
    }
  }
}

const pairArbitrageService = new PairArbitrage();
export default pairArbitrageService;
