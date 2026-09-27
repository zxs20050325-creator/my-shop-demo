const readline = require('readline');
const { Client } = require('pg');
require('dotenv').config();
const { hashPassword } = require('../src/shared/security');

function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(question, answer => {
        rl.close();
        resolve(answer.trim());
    }));
}

async function main() {
    const username = process.argv[2] || process.env.ADMIN_USERNAME || await ask('管理员用户名：');
    const password = process.env.ADMIN_INITIAL_PASSWORD || await ask('管理员密码（至少 8 位）：');
    if (!username || password.length < 8) {
        throw new Error('用户名不能为空，密码至少 8 位');
    }

    if (!process.env.DATABASE_URL) {
        throw new Error('缺少 DATABASE_URL');
    }

    const db = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await db.connect();
    try {
        await db.query(
            `INSERT INTO users (username, nickname, password_hash, role, status)
             VALUES ($1, $2, $3, 'admin', 1)
             ON CONFLICT (username)
             DO UPDATE SET
                 nickname = EXCLUDED.nickname,
                 password_hash = EXCLUDED.password_hash,
                 role = 'admin',
                 status = 1`,
            [username.toLowerCase(), username, hashPassword(password)]
        );
        console.log(`管理员 ${username} 已创建或更新`);
    } finally {
        await db.end();
    }
}

main().catch(error => {
    console.error('创建管理员失败：', error.message);
    process.exit(1);
});
