const path = require('node:path');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const REQUIRED_TABLES = [
  'users',
  'tools',
  'categories',
  'favorites',
  'tool_orders',
  'discovery_tools',
];

async function checkSchema() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [REQUIRED_TABLES],
    );
    const existingTables = new Set(result.rows.map((row) => row.table_name));
    const missingTables = REQUIRED_TABLES.filter((table) => !existingTables.has(table));

    if (missingTables.length > 0) {
      throw new Error(`Missing database tables: ${missingTables.join(', ')}`);
    }

    console.log(`Database schema OK (${REQUIRED_TABLES.length} required tables found).`);
  } finally {
    await client.end();
  }
}

checkSchema().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
