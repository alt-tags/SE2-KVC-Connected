// tests/config/db.test.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Load environment variables
const mysql = require('mysql2/promise');

describe('Direct Database Connection Test', () => {
  it('should connect to the database successfully', async () => {

    const connection = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    }).getConnection();

    expect(connection).toBeDefined(); // Check if the connection object exists

    await connection.release(); // Release the connection

  }, 10000); // Increase timeout to 10 seconds (optional)
});