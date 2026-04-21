import 'dotenv/config';
import { db } from './src/db/db.js';
import { matches } from './src/db/schema.js';

async function test() {
  try {
    const result = await db.select().from(matches);
    console.log('Query successful, found:', result.length, 'matches');
  } catch (e) {
    console.error('Query failed:', e);
  }
  process.exit(0);
}

test();
