import { Sequelize } from 'sequelize';
import CONFIG from '@/services/config';

const sequelize = new Sequelize(CONFIG.DB_URI);

export default sequelize;
