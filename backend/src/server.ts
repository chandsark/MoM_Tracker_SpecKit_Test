import { createApp } from './app';
import { purgeExpiredSessions } from './auth/sessionStore';
import { config } from './config';
import { initDb } from './db';

await initDb();
await purgeExpiredSessions();

const app = createApp();
app.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
});
