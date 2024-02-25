import { configurationService, logger } from '../services';
import CONFIG from '../services/config';
import sequelize from './connection';

export { default as ConfigurationModel } from './configuration';
export { default as TransactionModel } from './transaction';
export { default as TelegramHistoryModel } from './telegramHistory';

export const initDatabase = async () => {
  await sequelize.sync({ force: CONFIG.INIT_DB === 'true' });

  await configurationService.initData();
  logger.info('Connect database successfully', '\n');
};
