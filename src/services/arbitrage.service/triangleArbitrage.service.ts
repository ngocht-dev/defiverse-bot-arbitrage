import {
  BatchSwapStep,
  PoolToken,
  PoolWithMethods,
  QuerySimpleFlashSwapResponse,
  SwapType,
  Swaps,
} from '@balancer-labs/sdk';
import lockfile from 'lockfile';
import { configurationService, logger } from '..';
import { Arbitrage, PairType } from './arbitrage';
import { balancer, getPoolByPoolId, signerAddress } from '../balancer.service';
import CONFIG from '../config';
import { sum } from 'lodash';

class TriangleArbitrage extends Arbitrage {
  protected lockedFilePath: string = 'triangle.arbitrage.lock';
  protected name: string = 'TriangleArbitrage';

  private getAssetIndex(pool: PoolWithMethods, symbol: string) {
    const index = pool.tokens.findIndex(
      (item: PoolToken) => item.symbol === symbol,
    );
    if (index < 0) {
      throw new Error(`Can not find ${symbol} in pool: ${pool.id}`);
    }
    return index;
  }

  async handlePair(pair: PairType) {
    try {
      await this.waitUntilUnlock();
      if (!this.flag) {
        return;
      }
      await lockfile.lockSync(this.lockedFilePath);

      const pool1 = await getPoolByPoolId(pair.pairs[0]);
      const pool2 = await getPoolByPoolId(pair.pairs[1]);
      const pool3 = await getPoolByPoolId(pair.pairs[2]);
      const [symbol1, symbol2, symbol3] = pair.symbols.split('-');
      const token1 = pool1.tokens[this.getAssetIndex(pool1, symbol1)];
      const token2 = pool1.tokens[this.getAssetIndex(pool1, symbol2)];
      const token3 = pool1.tokens[this.getAssetIndex(pool1, symbol3)];
      const data = {
        kind: SwapType.SwapExactIn,
        swaps: [
          {
            poolId: pool1.id,
            assetInIndex: 0,
            assetOutIndex: 1,
            amount: CONFIG.TRIANGLE_ARBITRAGE.AMOUNT,
            userData: '0x',
          },
          {
            poolId: pool2.id,
            assetInIndex: 1,
            assetOutIndex: 2,
            amount: '0',
            userData: '0x',
          },
          {
            poolId: pool3.id,
            assetInIndex: 2,
            assetOutIndex: 0,
            amount: '0',
            userData: '0x',
          },
        ],
        assets: [token1.address, token2.address, token3.address],
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
    } catch (error) {
      logger.error(error, `${this.name}.handlePair`);
    } finally {
      await lockfile.unlockSync(this.lockedFilePath);
    }
  }

  getPairs(): Array<PairType> {
    return CONFIG.TRIANGLE_ARBITRAGE.PAIRS;
  }

  private deltaToExpectedProfit(delta: string) {
    return Number(delta) * -1;
  }

  private calcProfit(profits: string[]) {
    return sum(profits);
  }

  async getProfit({
    kind,
    assets,
    swaps,
  }: {
    kind: SwapType;
    swaps: BatchSwapStep[];
    assets: Array<string>;
  }): Promise<QuerySimpleFlashSwapResponse> {
    try {
      const deltas = await balancer.swaps.queryBatchSwap({
        assets,
        kind,
        swaps,
      });

      const profits = {
        [assets[0]]: this.deltaToExpectedProfit(deltas[0]).toString(),
        [assets[1]]: this.deltaToExpectedProfit(deltas[1]).toString(),
        [assets[2]]: this.deltaToExpectedProfit(deltas[2]).toString(),
      };

      return {
        profits,
        isProfitable:
          this.calcProfit([
            profits[assets[0]],
            profits[assets[1]],
            profits[assets[2]],
          ]) > 0,
      };
    } catch (error) {
      // logger.error(error, `${this.name}.getProfit`);
      return {
        isProfitable: false,
        profits: {},
      };
    }
  }

  async trade({
    kind,
    assets,
    swaps,
  }: {
    kind: SwapType;
    swaps: BatchSwapStep[];
    assets: Array<string>;
  }) {
    try {
      const encodeData = Swaps.encodeBatchSwap({
        assets,
        kind,
        swaps,
        funds: {
          fromInternalBalance: false,
          recipient: signerAddress,
          sender: signerAddress,
          toInternalBalance: false,
        },
        limits: [CONFIG.TRIANGLE_ARBITRAGE.AMOUNT, '0', '0'], // +ve for max to send, -ve for min to receive
        deadline: '999999999999999999', // Infinity
      });
      const receipt = await this.sendTransaction(encodeData);
      return receipt.transactionHash;
    } catch (error) {
      logger.error(error, `${this.name}.trade`);
      return null;
    }
  }
}

const triangleArbitrageService = new TriangleArbitrage();
export default triangleArbitrageService;
