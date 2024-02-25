/**
 * Keep this file in sync with the code in the "Usage without strict types for
 * attributes" section in /docs/manual/other-topics/typescript.md
 *
 * Don't include this comment in the md file.
 */
import { Model, DataTypes } from 'sequelize';

import sequelize from './connection';

class TelegramHistory extends Model {
  declare id: string;
  declare fullName: string;
  declare username: string;
  declare command: string;
}

TelegramHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: {
      type: new DataTypes.STRING(128),
    },
    username: {
      type: new DataTypes.STRING(128),
    },
    command: {
      type: new DataTypes.STRING(128),
    },
  },
  {
    tableName: 'telegram_histories',
    timestamps: true,
    sequelize,
  },
);

export default TelegramHistory;
