const { Client } = require('pg');
require('dotenv').config();
const { hashPassword } = require('../src/shared/security');

const DEMO_PASSWORD = 'demo123456';
const DEMO_USERS = [
    'demo_zhangwei',
    'demo_lina',
    'demo_wangfang',
    'demo_liuyang',
    'demo_chenjing',
    'demo_zhaolei'
];

function client() {
    return new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
}

async function clean() {
    const db = client();
    await db.connect();
    try {
        const users = await db.query(
            'SELECT id FROM users WHERE username = ANY($1::text[])',
            [DEMO_USERS]
        );
        const ids = users.rows.map(row => row.id);
        if (ids.length) {
            await db.query('DELETE FROM orders WHERE user_id = ANY($1::bigint[])', [ids]);
            await db.query('DELETE FROM cart_items WHERE user_id = ANY($1::bigint[])', [ids]);
            await db.query('DELETE FROM favorites WHERE user_id = ANY($1::bigint[])', [ids]);
            await db.query('DELETE FROM user_addresses WHERE user_id = ANY($1::bigint[])', [ids]);
            await db.query('DELETE FROM auth_sessions WHERE user_id = ANY($1::bigint[])', [ids]);
            await db.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
        }
        await db.query('DELETE FROM user_logs WHERE username = ANY($1::text[])', [DEMO_USERS]);
        console.log('演示数据已清理');
    } finally {
        await db.end();
    }
}

async function seed() {
    const db = client();
    await db.connect();
    try {
        const products = await db.query(
            `SELECT p.id, p.name, s.id AS sku_id
               FROM products p
               JOIN product_skus s ON s.product_id = p.id AND s.active = 1
              WHERE p.status = 1
              ORDER BY p.id
              LIMIT 12`
        );
        if (!products.rows.length) throw new Error('没有可用的演示商品');

        const userIds = [];
        for (let index = 0; index < DEMO_USERS.length; index += 1) {
            const username = DEMO_USERS[index];
            const user = await db.query(
                `INSERT INTO users (username, nickname, password_hash)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (username)
                 DO UPDATE SET nickname = EXCLUDED.nickname,
                               password_hash = EXCLUDED.password_hash
                 RETURNING id`,
                [username, `演示用户${index + 1}`, hashPassword(DEMO_PASSWORD)]
            );
            const userId = user.rows[0].id;
            userIds.push(userId);

            await db.query(
                `INSERT INTO user_addresses
                    (user_id, recipient, phone, province, city, district, detail, is_default)
                 VALUES ($1, $2, $3, '河北省', '石家庄市', '正定县', $4, TRUE)`,
                [userId, `演示用户${index + 1}`, `1380000000${index}`, `古城演示地址 ${index + 1} 号`]
            );

            const product = products.rows[index % products.rows.length];
            await db.query(
                `INSERT INTO cart_items (user_id, sku_id, quantity)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, sku_id)
                 DO UPDATE SET quantity = EXCLUDED.quantity`,
                [userId, product.sku_id, 1 + (index % 2)]
            );

            await db.query(
                `INSERT INTO user_logs (username, action, product)
                 VALUES ($1, '浏览主页', ''), ($1, '查看商品详情', $2)`,
                [username, product.name]
            );
        }

        for (const userId of userIds.slice(0, 3)) {
            const address = await db.query(
                'SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY id LIMIT 1',
                [userId]
            );
            const order = await db.query(
                'SELECT create_order_from_cart($1, $2, $3) AS result',
                [userId, address.rows[0].id, 'wechat']
            );
            await db.query(
                'SELECT demo_pay_order($1, $2, $3)',
                [order.rows[0].result.id, userId, 'wechat']
            );
        }

        console.log(`演示数据已生成，统一密码：${DEMO_PASSWORD}`);
    } finally {
        await db.end();
    }
}

(process.argv.includes('--clean') ? clean() : seed()).catch(error => {
    console.error('演示数据处理失败：', error.message);
    process.exit(1);
});
