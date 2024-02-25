import config from '../../config.json';

const validateField = (fieldName: string, value: string | number) => {
  if (!value) {
    throw new Error(`Missing config ${fieldName}`);
  }
};

validateField('process.env.SIGNER_ADDRESS', process.env.SIGNER_ADDRESS);
validateField('process.env.SIGNER_PRIVATE_KEY', process.env.SIGNER_PRIVATE_KEY);
validateField('process.env.TELEGRAM_TOKEN', process.env.TELEGRAM_TOKEN);
validateField('process.env.DB_URI', process.env.DB_URI);
validateField('process.env.PORT', process.env.PORT);

const CONFIG = {
  ...config,
  PORT: process.env.PORT,
  DB_URI: process.env.DB_URI,
  INIT_DB: process.env.INIT_DB,
  INFURA: process.env.INFURA,
  SIGNER_PRIVATE_KEY: process.env.SIGNER_PRIVATE_KEY,
  SIGNER_ADDRESS: process.env.SIGNER_ADDRESS,
};

export default CONFIG;
