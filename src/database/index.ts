// src/database/index.ts
import { Pool } from 'pg';

import dotenv from 'dotenv';
dotenv.config();

console.log('Connecting to database...');

const pool = new Pool({
    host: process.env.DB_HOST ,
     port: parseInt(process.env.DB_PORT || '5432', 10) , // Assuming the port is still 5432, you can set it as an env variable if needed.
     database: process.env.DB_NAME ,
     user: process.env.DB_USER ,
     password: process.env.DB_PASSWORD ,
});


export default pool;


