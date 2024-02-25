import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger } from '@/services/index.service';
import CONFIG from '@/services/config';

const app = express();
app.use(helmet());
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('combined'));

app.get('/healthcheck', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// starting the server
app.listen(CONFIG.PORT, () => {
  logger.info(`Listening on port ${CONFIG.PORT}`);
});
