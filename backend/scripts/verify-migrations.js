const { Client } = require('pg');
require('dotenv').config();

const checks = [
    ['users', 'password_hash'],
    ['auth_sessions', 'refresh_hash'],
    ['user_addresses', 'is_default'],
    ['categories', 'name'],
    ['products', 'cover_img'],
    ['product_skus', 'stock'],
    ['cart_items', 'sku_id'],
    ['favorites', 'product_id'],
    ['orders', 'payable_amount_cents'],
    ['order_items', 'subtotal_cents'],
    ['refund_requests', 'status'],
    ['payment_records', 'transaction_no'],
    ['inventory_logs', 'change_quantity']
];

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('缺少 DATABASE_URL');
    }
    const db = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await db.connect();
    const failures = [];
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
            if (!result.rowCount) failures.push(`${table}.${column}: 不存在`);
        }
    } finally {
        await db.end();
    }

    if (failures.length) {
        console.error('迁移检查失败：');
        failures.forEach(item => console.error(`  - ${item}`));
        process.exit(1);
    }
    console.log(`迁移检查通过：${checks.length} 项`);
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
