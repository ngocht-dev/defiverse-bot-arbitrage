import {
  BatchSwapStep,
  PoolToken,
  PoolWithMethods,
  QuerySimpleFlashSwapResponse,
  SwapType,
  Swaps,
} from '@defiverse/balancer-sdk';
import BigNumber from 'bignumber.js';
import lockfile from 'lockfile';
import { sum } from 'lodash';
import { configurationService, logger } from '@/services/index.service';
import { Arbitrage, PairType } from './base.arbitrage';
import {
  balancer,
  getPoolByPoolId,
  signerAddress,
} from '@/services/balancer.service';
import CONFIG from '@/services/config';

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
      const token2 = pool2.tokens[this.getAssetIndex(pool2, symbol2)];
      const token3 = pool3.tokens[this.getAssetIndex(pool3, symbol3)];

      const data = {
        kind: SwapType.SwapExactIn,
        swaps: [
          {
            poolId: pool1.id,
            assetInIndex: 0,
            assetOutIndex: 1,
            amount: new BigNumber(pair.minAmount)
              .multipliedBy(new BigNumber(10).pow(token1.decimals))
              .toString(),
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
        funds: {
          fromInternalBalance: false,
          recipient: signerAddress,
          sender: signerAddress,
          toInternalBalance: false,
        },
        milestone: new BigNumber(pair.milestone)
          .multipliedBy(new BigNumber(10).pow(token1.decimals))
          .toString(),
      };

      const profit = await this.getProfit(data);

      console.log('profit: ', pair.symbols, profit);
      const isGreatThanMinProfit = new BigNumber(profit.profit).gte(
        new BigNumber(pair.minProfit).multipliedBy(
          new BigNumber(10).pow(token1.decimals),
        ),
      );

      if (profit.isProfitable && isGreatThanMinProfit) {
        logger.info(
          `Expected: Pair ${pair.symbols} has profit ${profit.profit}`,
        );
        const tx = await this.trade({
          ...data,
          profit,
        });
        if (tx) {
          await this.recordTransaction(`${pair.symbols}`, profit.profit, tx);
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
    funds,
    milestone,
  }: {
    kind: SwapType;
    swaps: BatchSwapStep[];
    assets: Array<string>;
    funds: Object;
    milestone: string;
  }): Promise<
    QuerySimpleFlashSwapResponse & { profit: string; amount: string }
  > {
    try {
      let results = {
        profit: 0,
        profits: {},
      };

      const steps = [...Array(CONFIG.TRIANGLE_ARBITRAGE.RETRY).keys()];

      for (const step of steps) {
        try {
          swaps[0].amount = new BigNumber(swaps[0].amount)
            .plus(new BigNumber(milestone).multipliedBy(step))
            .toString();

          const deltas =
            await balancer.contracts.vault.callStatic.queryBatchSwap(
              kind,
              swaps,
              assets,
              funds as any,
            );

          const profits = {
            [assets[0]]: this.deltaToExpectedProfit(
              deltas[0].toString(),
            ).toString(),
            [assets[1]]: this.deltaToExpectedProfit(
              deltas[1].toString(),
            ).toString(),
            [assets[2]]: this.deltaToExpectedProfit(
              deltas[2].toString(),
            ).toString(),
          };

          const profit = this.calcProfit([
            profits[assets[0]],
            profits[assets[1]],
            profits[assets[2]],
          ]);

          if (profit > results.profit) {
            results.profit = profit;
            results.profits = profits;
          }
        } catch (error) {
          logger.error(error, `${this.name}.getProfit => amount: ${swaps[0].amount}`);
        }
      }

      return {
        profits: results.profits,
        isProfitable: results.profit > 0,
        profit: String(results.profit),
        amount: swaps[0].amount,
      };
    } catch (error) {
      logger.error(error, `${this.name}.getProfit`);
      return {
        isProfitable: false,
        profits: {},
        profit: '0',
        amount: '0',
      };
    }
  }

  async trade({
    kind,
    assets,
    swaps,
    profit,
  }: {
    kind: SwapType;
    swaps: BatchSwapStep[];
    assets: Array<string>;
    profit: any;
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
        limits: [profit.amount, '0', '0'], // +ve for max to send, -ve for min to receive
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
