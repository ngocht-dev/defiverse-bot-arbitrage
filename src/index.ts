import 'dotenv/config';
import { initDatabase } from './models';
import { telegramService } from './services';

const start = async () => {
  await initDatabase();
  require('./app');
  telegramService.listen();
};

start();
