const { Client } = require('pg');
require('dotenv').config();

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    await client.query('BEGIN');
    try {
        const users = await client.query(
            `SELECT id FROM users
              WHERE username LIKE 'codex_test_%'
                 OR username LIKE 'flow_test_%'
                 OR username LIKE 'diag_%'
                 OR username LIKE 'verify_%'`
        );
        const ids = users.rows.map(row => row.id);
        if (ids.length) {
            await client.query('DELETE FROM orders WHERE user_id = ANY($1::bigint[])', [ids]);
            await client.query('DELETE FROM cart_items WHERE user_id = ANY($1::bigint[])', [ids]);
            await client.query('DELETE FROM favorites WHERE user_id = ANY($1::bigint[])', [ids]);
            await client.query('DELETE FROM user_addresses WHERE user_id = ANY($1::bigint[])', [ids]);
            await client.query('DELETE FROM auth_sessions WHERE user_id = ANY($1::bigint[])', [ids]);
            await client.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
        }
        await client.query(
            `DELETE FROM user_logs
              WHERE username LIKE 'codex_test_%'
                 OR username LIKE 'flow_test_%'
                 OR username LIKE 'diag_%'
                 OR username LIKE 'verify_%'`
        );
        await client.query('COMMIT');
        console.log(`已清理测试用户 ${ids.length} 个`);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        await client.end();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
