/**
 * Keep this file in sync with the code in the "Usage without strict types for
 * attributes" section in /docs/manual/other-topics/typescript.md
 *
 * Don't include this comment in the md file.
 */
import { Model, DataTypes } from 'sequelize';

import sequelize from './connection';

export class Configuration extends Model {
  declare id: number;
  declare minProfit: number;
}

Configuration.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    minProfit: {
      type: new DataTypes.DOUBLE(),
    },
  },
  {
    tableName: 'configurations',
    timestamps: true,
    sequelize,
  },
);

export default Configuration;
