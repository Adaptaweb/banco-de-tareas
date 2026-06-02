import 'dotenv/config';
import { startBot, reloadFromDb } from './lib/telegram.js';

reloadFromDb();
startBot();
