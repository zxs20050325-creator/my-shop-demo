const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('缺少 DATABASE_URL。请在 backend/.env 中配置 Supabase 数据库连接串。');
    process.exit(1);
}

const migrationsDir = path.resolve(__dirname, '../migrations');
const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

async function main() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    try {
        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            console.log(`执行迁移 ${file} ...`);
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('COMMIT');
                console.log(`完成 ${file}`);
            } catch (error) {
                await client.query('ROLLBACK');
                throw new Error(`${file} 执行失败：${error.message}`);
            }
        }
    } finally {
        await client.end();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
