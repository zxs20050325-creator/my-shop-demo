const app = require('./app');
const env = require('./config/env');
const { Client } = require('pg');

async function verifySchema() {
    const checks = [
        ['users', 'password_hash'],
        ['user_addresses', 'recipient'],
        ['product_skus', 'price_cents'],
        ['cart_items', 'sku_id'],
        ['orders', 'payable_amount_cents'],
        ['refund_requests', 'status']
    ];

    if (!process.env.DATABASE_URL) {
        throw new Error('缺少 DATABASE_URL，无法检查数据库迁移');
    }
    const db = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await db.connect();
    try {
        for (const [table, column] of checks) {
            const result = await db.query(
                `SELECT 1
                   FROM information_schema.columns
                  WHERE table_schema = 'public'
                    AND table_name = $1
                    AND column_name = $2`,
                [table, column]
            );
            if (!result.rowCount) {
                throw new Error(`数据库迁移未完成：${table}.${column}`);
            }
        }
    } finally {
        await db.end();
    }
}

async function start() {
    await verifySchema();
    app.listen(env.port, '0.0.0.0', () => {
        console.log(`冀遗筑梦后端已启动：http://localhost:${env.port}`);
    });
}

if (require.main === module) {
    start().catch(error => {
        console.error('服务启动失败：', error.message);
        process.exit(1);
    });
}

module.exports = { app, start, verifySchema };
