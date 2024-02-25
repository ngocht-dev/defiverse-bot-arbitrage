import { cacheService } from './index.service';
import { ConfigurationModel } from '@/models';
import Configuration from '@/models/configuration';

class ConfigurationService {
  private configurationCacheKey: string = 'arbitrage.config.cache';
  private defaultConfigId: number = 1;

  async initData() {
    await ConfigurationModel.findOrCreate({
      where: { id: this.defaultConfigId },
      defaults: {
        id: 1,
        minProfit: process.env.MIN_PROFIT ?? 0.1,
      },
    });
  }

  async getConfig(): Promise<ConfigurationModel> {
    const cacheConfig = cacheService.get(this.configurationCacheKey);
    if (cacheConfig) {
      return cacheConfig as Configuration;
    }

    const config = await ConfigurationModel.findOne({ raw: true });
    cacheService.set(this.configurationCacheKey, config, 5 * 60);
    return config;
  }

  async updateMinProfit(minProfit: number) {
    cacheService.set(this.configurationCacheKey, null, 1);
    return ConfigurationModel.update(
      { minProfit: minProfit },
      {
        where: { id: this.defaultConfigId },
      },
    );
  }
}

const configurationService = new ConfigurationService();
export default configurationService;
