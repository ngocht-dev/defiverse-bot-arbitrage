import 'module-alias/register';
import 'dotenv/config';

import { initDatabase } from '@/models';
import { telegramService } from '@/services/index.service';

const start = async () => {
  await initDatabase();
  require('./app');
  telegramService.listen();
};

start();
