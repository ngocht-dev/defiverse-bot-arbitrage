import 'dotenv/config';
import { Pool, PoolToken, SwapType } from '@balancer-labs/sdk';
import { sum } from 'lodash';
import { balancer } from './services/balancer.service';

const scanTwoPools = async () => {
  const poolIds = (await balancer.pools.all()).map((item: Pool) => item.id);
  console.log(
    '\n\n ===== Start scan all two pools that has pair arbitrage ===== ',
  );
  let result: Array<PoolToken & { poolId1: string; poolId2: string }> = [];
  for (let i = 0; i < poolIds.length; i++) {
    const pool1 = await balancer.pools.find(poolIds[i]);
    const tokens1 = pool1.tokens;
    for (let j = i + 1; j < poolIds.length; j++) {
      const pool2 = await balancer.pools.find(poolIds[j]);
      const tokens2 = pool2.tokens;
      result = [];
      for (const item1 of tokens1) {
        for (const item2 of tokens2) {
          if (
            item1.address === item2.address &&
            !result.find((e: PoolToken) => e.address === item1.address)
          ) {
            result.push({
              ...item1,
              poolId1: poolIds[i],
              poolId2: poolIds[j],
            });
          }
          if (result.length >= 2) {
            try {
              let flashLoanAmount = 10;
              while (
                flashLoanAmount <
                Math.max(
                  parseInt(result[0].balance),
                  parseInt(result[1].balance),
                )
              ) {
                flashLoanAmount = flashLoanAmount * 10;

                try {
                  const response = await balancer.swaps.querySimpleFlashSwap({
                    flashLoanAmount: String(flashLoanAmount),
                    poolIds: [result[0].poolId1, result[1].poolId2],
                    assets: [result[0].address, result[1].address],
                  });
                  if (response.isProfitable) {
                    console.log(
                      `\n\n Pair arbitrage: Found pair token has profit if flashLoanAmount is: ${flashLoanAmount}. Token is`,
                      {
                        flashLoanAmount: String(flashLoanAmount),
                        poolIds: [result[0].poolId1, result[1].poolId2],
                        tokens: result,
                        response,
                      },
                    );
                  }
                } catch (error) {
                  // console.log('error ', error);
                }
                try {
                  const response = await balancer.swaps.querySimpleFlashSwap({
                    flashLoanAmount: String(flashLoanAmount),
                    poolIds: [result[1].poolId2, result[0].poolId1],
                    assets: [result[1].address, result[0].address],
                  });
                  if (response.isProfitable) {
                    console.log(
                      `\n\n Pair arbitrage: Found pair token has profit if flashLoanAmount is: ${flashLoanAmount}. Token is`,
                      {
                        flashLoanAmount: String(flashLoanAmount),
                        poolIds: [result[1].poolId2, result[0].poolId1],
                        tokens: [result[1], result[0]],
                        response,
                      },
                    );
                  }
                } catch (error) {
                  // console.log('error ', error);
                }
              }
            } finally {
              result = [];
            }
            // return;
          }
        }
      }
    }
  }
  console.log('===== finished scanTwoPools ===== ');
};

const scanThreePools = async () => {
  const deltaToExpectedProfit = (delta: string) => {
    return Number(delta) * -1;
  };

  const calcProfit = (profits: string[]) => {
    return sum(profits);
  };

  const poolIds = (await balancer.pools.all()).map((item: Pool) => item.id);
  console.log(
    '\n\n ===== Start scan all three pools that has triangle arbitrage ===== ',
  );
  let result: Array<
    PoolToken & { poolId1: string; poolId2: string; poolId3: string }
  > = [];
  for (let i = 0; i < poolIds.length; i++) {
    const pool1 = await balancer.pools.find(poolIds[i]);
    const tokens1 = pool1.tokens;
    for (let j = i + 1; j < poolIds.length; j++) {
      const pool2 = await balancer.pools.find(poolIds[j]);
      const tokens2 = pool2.tokens;
      result = [];
      for (const item1 of tokens1) {
        for (const item2 of tokens2) {
          if (
            item1.address === item2.address &&
            !result.find((e: PoolToken) => e.address === item1.address)
          ) {
            result.push({
              ...item1,
              poolId1: poolIds[i],
              poolId2: poolIds[j],
              poolId3: '',
            });
          }
          /**
           * pool 1: A B
           * pool 2: A B C
           * pool 3: C A
           */
          if (result.length >= 2) {
            for (let k = j + 1; k < poolIds.length; k++) {
              const pool3 = await balancer.pools.find(poolIds[k]);
              const tokens3 = pool3.tokens;
              const existA = tokens3.find(
                (e: PoolToken) => e.address === result[0].address,
              );
              if (!existA) {
                continue;
              }
              for (const item3 of tokens3) {
                if (
                  item2.address === item3.address &&
                  !result.find((e: PoolToken) => e.address === item3.address)
                ) {
                  result.push({
                    ...item3,
                    poolId1: poolIds[i],
                    poolId2: poolIds[j],
                    poolId3: poolIds[k],
                  });
                }
                if (result.length >= 3) {
                  try {
                    let flashLoanAmount = 10;
                    while (
                      flashLoanAmount <
                      Math.max(
                        parseInt(result[0].balance),
                        parseInt(result[1].balance),
                        parseInt(result[2].balance),
                      )
                    ) {
                      flashLoanAmount = flashLoanAmount * 10;

                      try {
                        const deltas = await balancer.swaps.queryBatchSwap({
                          kind: SwapType.SwapExactIn,
                          swaps: [
                            {
                              poolId: pool1.id,
                              assetInIndex: 0,
                              assetOutIndex: 1,
                              amount: String(flashLoanAmount),
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
                          assets: [
                            result[0].address,
                            result[1].address,
                            result[2].address,
                          ],
                        });
                        const profits = {
                          [result[0].address]: deltaToExpectedProfit(
                            deltas[0],
                          ).toString(),
                          [result[1].address]: deltaToExpectedProfit(
                            deltas[1],
                          ).toString(),
                          [result[2].address]: deltaToExpectedProfit(
                            deltas[2],
                          ).toString(),
                        };

                        const response = {
                          profits,
                          isProfitable:
                            calcProfit([
                              profits[result[0].address],
                              profits[result[1].address],
                              profits[result[2].address],
                            ]) > 0,
                        };

                        // console.log(
                        //   `Triangle arbitrage: Token ${result[0].symbol}-${result[1].symbol}-${result[2].symbol} with amount ${flashLoanAmount} has profit ${calcProfit(
                        //     [
                        //       profits[result[0].address],
                        //       profits[result[1].address],
                        //       profits[result[2].address],
                        //     ],
                        //   )}`,
                        //   {
                        //     symbols: `${result[0].symbol}-${result[1].symbol}-${result[2].symbol}`,
                        //     pairs: [pool1.id, pool2.id, pool3.id],
                        //   },
                        // );
                        if (response.isProfitable) {
                          console.log(
                            `\n\n Triangle arbitrage: Found triangle token has profit if amount is: ${flashLoanAmount}. Token is ${result[0].symbol}-${result[1].symbol}-${result[2].symbol}`,
                            result,
                            '\nResponse is: ',
                            response,
                          );
                        }
                      } catch (error) {
                        // console.log('error ', error);
                      }
                    }
                  } finally {
                    result.pop();
                  }
                  // return;
                }
              }
            }
          }
        }
      }
    }
  }
  console.log('===== finished scanThreePools ===== ');
};

// scanTwoPools();
scanThreePools();
