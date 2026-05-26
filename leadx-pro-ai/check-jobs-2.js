const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'user',
    database: process.env.DB_NAME || 'leadx_pro_ai'
  });

  const [jobs] = await connection.execute("SELECT * FROM scrape_jobs ORDER BY id DESC LIMIT 10;");
  console.log('--- Scrape Jobs ---');
  console.log(jobs);

  const [leads] = await connection.execute("SELECT * FROM scraped_companies WHERE deleted_at IS NULL;");
  console.log('--- Scraped Companies ---');
  console.log(leads);

  await connection.end();
}

run().catch(console.error);
