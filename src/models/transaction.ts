/**
 * Keep this file in sync with the code in the "Usage without strict types for
 * attributes" section in /docs/manual/other-topics/typescript.md
 *
 * Don't include this comment in the md file.
 */
import { Model, DataTypes } from 'sequelize';

import sequelize from './connection';

class Transaction extends Model {
  declare id: string;
  declare pair: string;
  declare profit: number;
  declare transactionHash: string;
}

Transaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    pair: {
      type: new DataTypes.STRING(128),
    },
    transactionHash: {
      type: new DataTypes.STRING(128),
    },
    profit: {
      type: new DataTypes.DOUBLE(),
    },
  },
  {
    tableName: 'transactions',
    timestamps: true,
    sequelize,
  },
);

export default Transaction;
