import TelegramBot from 'node-telegram-bot-api';
import { TelegramHistoryModel } from '@/models';
import { logger } from '@/services/logger.service';
import arbitrageService from '@/services/arbitrage/index.arbitrage';
import configurationService from '@/services/configuration.service';

class Telegram {
  private bot: TelegramBot;
  private chatId: number;
  private command = {
    start: '/start',
    stop: '/stop',
    help: '/help',
    getConfig: '/getconfig',
    setMinProfit: '/setminprofit',
  };

  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
  }

  public listen() {
    this.bot.on('message', async (msg: TelegramBot.Message) => {
      logger.info(`Received command "${msg.text}" from telegram`);
      if (
        [this.command.start, this.command.stop, this.command.setMinProfit].find(
          (item: string) => {
            const text = String(msg.text).toLowerCase();
            return text === item || text.startsWith(item);
          },
        )
      ) {
        this.logCommand(msg);
      }

      await this.handleCommand(msg);
    });
  }

  private async handleCommand(msg: TelegramBot.Message) {
    switch (String(msg.text).toLowerCase()) {
      case this.command.start:
        if (arbitrageService.getState()) {
          if (msg.chat.id !== this.chatId) {
            this.sendMessageViaChatId(
              msg.chat.id,
              `Can not start because bot is running for group: ${this.chatId}`,
            );
          }

          return;
        }

        this.chatId = msg.chat.id;
        arbitrageService.start();
        this.sendMessage('Bot started');
        logger.info('Bot started');
        break;

      case this.command.stop:
        arbitrageService.end();
        this.sendMessage('Bot stopped');
        logger.info('Bot stopped');
        break;

      case this.command.getConfig:
        const config = await configurationService.getConfig();
        this.sendMessageViaChatId(
          msg.chat.id,
          `
          Current config of bot:
          Min Profit: ${config.minProfit}
          `,
        );
        break;

      case this.command.help:
        this.sendMessageViaChatId(
          msg.chat.id,
          `
        You can control bot by sending these commands:
        ${this.command.start} - start bot
        ${this.command.stop} - end bot
        ${this.command.getConfig} - return current configuration of bot
        ${this.command.setMinProfit} - set min profit of bot. Syntax: '${this.command.setMinProfit} <Value>'. Example: '${this.command.setMinProfit} 0.1'
        /help - get information about bot and commands to use bot
        `,
        );
        break;

      default:
        await this.handleRegexCommand(msg);
        return;
    }
  }

  private async handleRegexCommand(msg: TelegramBot.Message) {
    const text = String(msg.text).toLowerCase();

    if (text.startsWith(this.command.setMinProfit)) {
      const regex = text.match(/\/setminprofit (.+)/);
      const value = regex ? regex[1] : null;

      if (value === null || isNaN(value as any) || parseFloat(value) <= 0) {
        this.sendMessageViaChatId(
          msg.chat.id,
          `Invalid value of command ${this.command.setMinProfit}. Syntax: '${this.command.setMinProfit} <Value>'. Value must be greater than 0. Example: '${this.command.setMinProfit} 0.1'`,
        );
        return;
      }

      await configurationService.updateMinProfit(parseFloat(value));
      this.sendMessageViaChatId(msg.chat.id, `Min profit was updated`);
    }
  }

  private async logCommand(message: TelegramBot.Message) {
    return TelegramHistoryModel.create({
      fullName: `${message.from.first_name} ${message.from.last_name}`,
      username: message.from.username,
      command: message.text,
    });
  }

  public sendMessage(message: string) {
    if (this.chatId) {
      return this.sendMessageViaChatId(this.chatId, message);
    }
  }

  public sendMessageViaChatId(chatId: number, message: string) {
    return this.bot.sendMessage(chatId, message);
  }
}

const telegramService = new Telegram();
export default telegramService;
