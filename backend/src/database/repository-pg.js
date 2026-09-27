const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
});

async function query(text, params = []) {
    const result = await pool.query(text, params);
    return result.rows;
}

async function withTransaction(handler) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await handler(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

function buildUpdate(patch, allowed, startIndex = 2) {
    const fields = [];
    const values = [];
    let index = startIndex;
    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined) {
            fields.push(`${key} = $${index}`);
            values.push(patch[key]);
            index += 1;
        }
    }
    return { fields, values };
}

async function attachOrderItems(orders) {
    if (!orders.length) return orders;
    const ids = orders.map(order => order.id);
    const items = await query(
        'SELECT * FROM order_items WHERE order_id = ANY($1::bigint[]) ORDER BY id',
        [ids]
    );
    const byOrder = new Map();
    for (const item of items) {
        const key = String(item.order_id);
        if (!byOrder.has(key)) byOrder.set(key, []);
        byOrder.get(key).push(item);
    }
    return orders.map(order => ({
        ...order,
        order_items: byOrder.get(String(order.id)) || []
    }));
}

async function attachRefunds(orders) {
    if (!orders.length) return orders;
    const ids = orders.map(order => order.id);
    const refunds = await query(
        'SELECT * FROM refund_requests WHERE order_id = ANY($1::bigint[]) ORDER BY id',
        [ids]
    );
    const byOrder = new Map();
    for (const refund of refunds) {
        const key = String(refund.order_id);
        if (!byOrder.has(key)) byOrder.set(key, []);
        byOrder.get(key).push(refund);
    }
    return orders.map(order => ({
        ...order,
        refund_requests: byOrder.get(String(order.id)) || []
    }));
}

function adminProductRow(product, skus) {
    return {
        ...product,
        categories: product.category_name ? {
            id: product.category_id,
            name: product.category_name
        } : null,
        product_skus: skus || []
    };
}

const repository = {
    async findUserByUsername(username) {
        const rows = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username]);
        return rows[0] || null;
    },

    async findUserById(id) {
        const rows = await query(
            `SELECT id, username, nickname, phone, role, status, created_at, updated_at
               FROM users WHERE id = $1 LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    async createUser({ username, passwordHash, nickname = '' }) {
        const rows = await query(
            `INSERT INTO users (username, password_hash, nickname)
             VALUES ($1, $2, $3)
             RETURNING id, username, nickname, role, status, created_at`,
            [username, passwordHash, nickname]
        );
        return rows[0];
    },

    async updateUserProfile(userId, patch) {
        const { fields, values } = buildUpdate(patch, ['nickname', 'phone']);
        if (!fields.length) return this.findUserById(userId);
        const rows = await query(
            `UPDATE users SET ${fields.join(', ')}
              WHERE id = $1
              RETURNING id, username, nickname, phone, role, created_at, updated_at`,
            [userId, ...values]
        );
        return rows[0] || null;
    },

    async updatePassword(userId, passwordHash) {
        const rows = await query(
            'UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING id',
            [userId, passwordHash]
        );
        return rows[0] || null;
    },

    async touchUserLogin(userId) {
        const rows = await query(
            'UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING id',
            [userId]
        );
        return rows[0] || null;
    },

    async createAuthSession({ userId, refreshHash, userAgent, ipAddress, expiresAt }) {
        const rows = await query(
            `INSERT INTO auth_sessions
                (user_id, refresh_hash, user_agent, ip_address, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [userId, refreshHash, userAgent || '', ipAddress || '', expiresAt]
        );
        return rows[0];
    },

    async findAuthSession(refreshHash) {
        const rows = await query(
            `SELECT id, user_id, expires_at, revoked_at
               FROM auth_sessions
              WHERE refresh_hash = $1
                AND revoked_at IS NULL
                AND expires_at > NOW()
              LIMIT 1`,
            [refreshHash]
        );
        return rows[0] || null;
    },

    async revokeAuthSession(refreshHash) {
        return query(
            `UPDATE auth_sessions SET revoked_at = NOW()
              WHERE refresh_hash = $1 AND revoked_at IS NULL
              RETURNING id`,
            [refreshHash]
        );
    },

    async revokeAllUserSessions(userId) {
        return query(
            `UPDATE auth_sessions SET revoked_at = NOW()
              WHERE user_id = $1 AND revoked_at IS NULL
              RETURNING id`,
            [userId]
        );
    },

    async listAddresses(userId) {
        return query(
            `SELECT * FROM user_addresses
              WHERE user_id = $1
              ORDER BY is_default DESC, created_at DESC`,
            [userId]
        );
    },

    async getAddress(userId, addressId) {
        const rows = await query(
            'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2 LIMIT 1',
            [addressId, userId]
        );
        return rows[0] || null;
    },

    async createAddress(userId, payload) {
        return withTransaction(async client => {
            const countResult = await client.query(
                'SELECT COUNT(*)::int AS count FROM user_addresses WHERE user_id = $1',
                [userId]
            );
            const shouldDefault = payload.isDefault || countResult.rows[0].count === 0;
            if (shouldDefault) {
                await client.query(
                    'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
                    [userId]
                );
            }
            const result = await client.query(
                `INSERT INTO user_addresses
                    (user_id, recipient, phone, province, city, district, detail, postal_code, is_default)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                    userId,
                    payload.recipient,
                    payload.phone,
                    payload.province || '',
                    payload.city || '',
                    payload.district || '',
                    payload.detail,
                    payload.postalCode || '',
                    !!shouldDefault
                ]
            );
            return result.rows[0];
        });
    },

    async updateAddress(userId, addressId, payload) {
        return withTransaction(async client => {
            if (payload.isDefault) {
                await client.query(
                    'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
                    [userId]
                );
            }
            const normalized = {
                recipient: payload.recipient,
                phone: payload.phone,
                province: payload.province,
                city: payload.city,
                district: payload.district,
                detail: payload.detail,
                postal_code: payload.postalCode,
                is_default: payload.isDefault ? true : undefined
            };
            const { fields, values } = buildUpdate(
                normalized,
                ['recipient', 'phone', 'province', 'city', 'district', 'detail', 'postal_code', 'is_default']
            );
            if (!fields.length) {
                const existing = await client.query(
                    'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2',
                    [addressId, userId]
                );
                return existing.rows[0] || null;
            }
            const result = await client.query(
                `UPDATE user_addresses SET ${fields.join(', ')}
                  WHERE id = $1 AND user_id = $2
                  RETURNING *`,
                [addressId, userId, ...values]
            );
            return result.rows[0] || null;
        });
    },

    async setDefaultAddress(userId, addressId) {
        return withTransaction(async client => {
            await client.query(
                'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
                [userId]
            );
            const result = await client.query(
                `UPDATE user_addresses SET is_default = TRUE
                  WHERE id = $1 AND user_id = $2
                  RETURNING *`,
                [addressId, userId]
            );
            return result.rows[0] || null;
        });
    },

    async deleteAddress(userId, addressId) {
        return withTransaction(async client => {
            const existing = await client.query(
                'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2 FOR UPDATE',
                [addressId, userId]
            );
            if (!existing.rows.length) return null;
            await client.query(
                'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2',
                [addressId, userId]
            );
            if (existing.rows[0].is_default) {
                await client.query(
                    `UPDATE user_addresses SET is_default = TRUE
                      WHERE id = (
                          SELECT id FROM user_addresses
                           WHERE user_id = $1
                           ORDER BY created_at DESC
                           LIMIT 1
                      )`,
                    [userId]
                );
            }
            return existing.rows[0];
        });
    },

    async searchProducts(params) {
        return query(
            `SELECT * FROM search_products_v2($1, $2, $3, $4, $5)`,
            [
                params.q || '',
                params.category || '',
                params.sort || 'default',
                params.page || 1,
                Math.min(params.pageSize || 12, 60)
            ]
        );
    },

    async getProductById(id) {
        const products = await query(
            `SELECT p.*, c.name AS category_name
               FROM products p
               LEFT JOIN categories c ON c.id = p.category_id
              WHERE p.id = $1
              LIMIT 1`,
            [id]
        );
        if (!products.length) return null;
        const skus = await query(
            'SELECT * FROM product_skus WHERE product_id = $1 ORDER BY id',
            [id]
        );
        return {
            ...products[0],
            categories: products[0].category_name
                ? { id: products[0].category_id, name: products[0].category_name }
                : null,
            product_skus: skus
        };
    },

    async getSkuById(skuId) {
        const rows = await query(
            `SELECT s.*,
                    jsonb_build_object(
                        'id', p.id,
                        'name', p.name,
                        'cover_img', p.cover_img,
                        'img', p.img,
                        'category', p.category,
                        'status', p.status
                    ) AS products
               FROM product_skus s
               JOIN products p ON p.id = s.product_id
              WHERE s.id = $1
              LIMIT 1`,
            [skuId]
        );
        return rows[0] || null;
    },

    async getCategories() {
        return query('SELECT * FROM get_categories_v2()');
    },

    async ensureCategory(name) {
        const normalized = String(name || '').trim();
        if (!normalized) return null;
        const rows = await query(
            `INSERT INTO categories (name)
             VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING *`,
            [normalized]
        );
        return rows[0];
    },

    async listCartItems(userId) {
        return query(
            `SELECT c.id, c.quantity, c.selected, c.created_at, c.updated_at,
                    jsonb_build_object(
                        'id', s.id,
                        'sku_code', s.sku_code,
                        'spec_values', s.spec_values,
                        'spec_text', s.spec_text,
                        'price_cents', s.price_cents,
                        'stock', s.stock,
                        'active', s.active,
                        'products', jsonb_build_object(
                            'id', p.id,
                            'name', p.name,
                            'subtitle', p.subtitle,
                            'cover_img', p.cover_img,
                            'img', p.img,
                            'category', p.category,
                            'status', p.status
                        )
                    ) AS product_skus
               FROM cart_items c
               JOIN product_skus s ON s.id = c.sku_id
               JOIN products p ON p.id = s.product_id
              WHERE c.user_id = $1
              ORDER BY c.created_at DESC, c.id DESC`,
            [userId]
        );
    },

    async findCartItem(userId, skuId) {
        const rows = await query(
            'SELECT * FROM cart_items WHERE user_id = $1 AND sku_id = $2 LIMIT 1',
            [userId, skuId]
        );
        return rows[0] || null;
    },

    async createCartItem(userId, skuId, quantity) {
        const rows = await query(
            `INSERT INTO cart_items (user_id, sku_id, quantity)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userId, skuId, quantity]
        );
        return rows[0];
    },

    async updateCartItem(userId, itemId, patch) {
        const { fields, values } = buildUpdate(patch, ['quantity', 'selected']);
        if (!fields.length) return null;
        const rows = await query(
            `UPDATE cart_items SET ${fields.join(', ')}
              WHERE id = $1 AND user_id = $2
              RETURNING *`,
            [itemId, userId, ...values]
        );
        return rows[0] || null;
    },

    async deleteCartItem(userId, itemId) {
        const rows = await query(
            'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
            [itemId, userId]
        );
        return rows[0] || null;
    },

    async clearCart(userId) {
        return query('DELETE FROM cart_items WHERE user_id = $1 RETURNING id', [userId]);
    },

    async listFavorites(userId) {
        return query(
            `SELECT f.id, f.product_id, f.created_at,
                    jsonb_build_object(
                        'id', p.id,
                        'name', p.name,
                        'subtitle', p.subtitle,
                        'description', p.description,
                        'cover_img', p.cover_img,
                        'img', p.img,
                        'category', p.category,
                        'status', p.status,
                        'product_skus', COALESCE(
                            jsonb_agg(
                                jsonb_build_object(
                                    'id', s.id,
                                    'price_cents', s.price_cents,
                                    'stock', s.stock,
                                    'active', s.active
                                )
                            ) FILTER (WHERE s.id IS NOT NULL),
                            '[]'::jsonb
                        )
                    ) AS products
               FROM favorites f
               JOIN products p ON p.id = f.product_id
               LEFT JOIN product_skus s ON s.product_id = p.id
              WHERE f.user_id = $1
              GROUP BY f.id, p.id
              ORDER BY f.created_at DESC, f.id DESC`,
            [userId]
        );
    },

    async addFavorite(userId, productId) {
        const rows = await query(
            `INSERT INTO favorites (user_id, product_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, product_id) DO NOTHING
             RETURNING id, product_id`,
            [userId, productId]
        );
        return rows[0] || { id: null, product_id: productId };
    },

    async removeFavorite(userId, productId) {
        return query(
            'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2 RETURNING id',
            [userId, productId]
        );
    },

    async createOrderFromCart(userId, addressId, paymentMethod) {
        const rows = await query(
            'SELECT create_order_from_cart($1, $2, $3) AS result',
            [userId, addressId, paymentMethod || 'wechat']
        );
        return rows[0].result;
    },

    async demoPayOrder(orderId, userId, method) {
        const rows = await query(
            'SELECT demo_pay_order($1, $2, $3) AS result',
            [orderId, userId, method || 'wechat']
        );
        return rows[0].result;
    },

    async cancelUnpaidOrder(orderId, userId, reason) {
        const rows = await query(
            'SELECT cancel_unpaid_order($1, $2, $3) AS result',
            [orderId, userId, reason || '用户取消']
        );
        return rows[0].result;
    },

    async listOrders({ userId, status, page = 1, pageSize = 20 }) {
        const conditions = [];
        const values = [];
        if (userId) {
            values.push(userId);
            conditions.push(`user_id = $${values.length}`);
        }
        if (status) {
            values.push(status);
            conditions.push(`status = $${values.length}`);
        }
        values.push(pageSize, (page - 1) * pageSize);
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const rows = await query(
            `SELECT *, COUNT(*) OVER()::int AS total_count
               FROM orders
               ${where}
              ORDER BY created_at DESC, id DESC
              LIMIT $${values.length - 1} OFFSET $${values.length}`,
            values
        );
        const total = rows[0]?.total_count || 0;
        rows.forEach(row => delete row.total_count);
        return { items: await attachOrderItems(rows), total };
    },

    async getOrderById(orderId, userId = null) {
        const values = [orderId];
        let sql = 'SELECT * FROM orders WHERE id = $1';
        if (userId) {
            values.push(userId);
            sql += ' AND user_id = $2';
        }
        sql += ' LIMIT 1';
        const rows = await query(sql, values);
        if (!rows.length) return null;
        const withItems = await attachOrderItems(rows);
        const withRefunds = await attachRefunds(withItems);
        return withRefunds[0];
    },

    async listOrderStatusLogs(orderId) {
        return query(
            'SELECT * FROM order_status_logs WHERE order_id = $1 ORDER BY created_at',
            [orderId]
        );
    },

    async requestRefund(orderId, userId, reason) {
        const rows = await query(
            'SELECT request_order_refund($1, $2, $3) AS result',
            [orderId, userId, reason]
        );
        return rows[0].result;
    },

    async listRefunds({ userId, status, page = 1, pageSize = 30 }) {
        const conditions = [];
        const values = [];
        if (userId) {
            values.push(userId);
            conditions.push(`r.user_id = $${values.length}`);
        }
        if (status) {
            values.push(status);
            conditions.push(`r.status = $${values.length}`);
        }
        values.push(pageSize, (page - 1) * pageSize);
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const rows = await query(
            `SELECT r.*,
                    jsonb_build_object(
                        'id', o.id,
                        'order_no', o.order_no,
                        'status', o.status,
                        'payable_amount_cents', o.payable_amount_cents,
                        'user_id', o.user_id,
                        'username', o.username
                    ) AS orders,
                    COUNT(*) OVER()::int AS total_count
               FROM refund_requests r
               JOIN orders o ON o.id = r.order_id
               ${where}
              ORDER BY r.created_at DESC, r.id DESC
              LIMIT $${values.length - 1} OFFSET $${values.length}`,
            values
        );
        const total = rows[0]?.total_count || 0;
        rows.forEach(row => delete row.total_count);
        return { items: rows, total };
    },

    async handleRefund(refundId, adminId, approve, note) {
        const rows = await query(
            'SELECT handle_order_refund($1, $2, $3, $4) AS result',
            [refundId, adminId, approve, note || '']
        );
        return rows[0].result;
    },

    async adminUpdateOrderStatus(orderId, status, adminId, remark) {
        const rows = await query(
            'SELECT admin_update_order_status($1, $2, $3, $4) AS result',
            [orderId, status, adminId, remark || '']
        );
        return rows[0].result;
    },

    async listAdminProducts({ page = 1, pageSize = 60 } = {}) {
        const rows = await query(
            `SELECT p.*, c.name AS category_name, COUNT(*) OVER()::int AS total_count
               FROM products p
               LEFT JOIN categories c ON c.id = p.category_id
              ORDER BY p.sort_order, p.id
              LIMIT $1 OFFSET $2`,
            [pageSize, (page - 1) * pageSize]
        );
        const total = rows[0]?.total_count || 0;
        rows.forEach(row => delete row.total_count);
        const ids = rows.map(row => row.id);
        const skus = ids.length
            ? await query(
                'SELECT * FROM product_skus WHERE product_id = ANY($1::bigint[]) ORDER BY id',
                [ids]
            )
            : [];
        const byProduct = new Map();
        skus.forEach(sku => {
            const key = String(sku.product_id);
            if (!byProduct.has(key)) byProduct.set(key, []);
            byProduct.get(key).push(sku);
        });
        return {
            items: rows.map(row => adminProductRow(row, byProduct.get(String(row.id)) || [])),
            total
        };
    },

    async createProduct(payload) {
        const rows = await query(
            `INSERT INTO products
                (name, subtitle, description, category, category_id, price, cover_img, img, status, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                payload.name,
                payload.subtitle || '',
                payload.description || '',
                payload.category,
                payload.categoryId || null,
                (payload.priceCents || 0) / 100,
                payload.coverImg || '',
                payload.coverImg || '',
                payload.status ?? 1,
                payload.status ?? 1
            ]
        );
        return rows[0];
    },

    async updateProduct(productId, payload) {
        const normalized = {
            ...payload,
            category_id: payload.categoryId,
            cover_img: payload.coverImg,
            img: payload.coverImg,
            active: payload.status === undefined
                ? undefined
                : (Number(payload.status) > 0 ? 1 : 0)
        };
        const { fields, values } = buildUpdate(
            normalized,
            ['name', 'subtitle', 'description', 'category', 'category_id', 'cover_img', 'img', 'status', 'active']
        );
        if (!fields.length) {
            const existing = await query('SELECT * FROM products WHERE id = $1', [productId]);
            return existing[0] || null;
        }
        const rows = await query(
            `UPDATE products SET ${fields.join(', ')}
              WHERE id = $1
              RETURNING *`,
            [productId, ...values]
        );
        return rows[0] || null;
    },

    async createSku(productId, payload) {
        const rows = await query(
            `INSERT INTO product_skus
                (product_id, sku_code, spec_values, spec_text, price_cents, stock, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                productId,
                payload.skuCode,
                payload.specValues || {},
                payload.specText || '默认规格',
                payload.priceCents || 0,
                payload.stock || 0,
                payload.active ?? 1
            ]
        );
        return rows[0];
    },

    async updateSku(skuId, payload) {
        const normalized = {
            sku_code: payload.skuCode,
            spec_values: payload.specValues,
            spec_text: payload.specText,
            price_cents: payload.priceCents,
            active: payload.active
        };
        const { fields, values } = buildUpdate(
            normalized,
            ['sku_code', 'spec_values', 'spec_text', 'price_cents', 'active']
        );
        if (!fields.length) {
            const existing = await query('SELECT * FROM product_skus WHERE id = $1', [skuId]);
            return existing[0] || null;
        }
        const rows = await query(
            `UPDATE product_skus SET ${fields.join(', ')}
              WHERE id = $1
              RETURNING *`,
            [skuId, ...values]
        );
        return rows[0] || null;
    },

    async adjustStock(skuId, stock, adminId, reason) {
        const rows = await query(
            'SELECT adjust_sku_stock($1, $2, $3, $4) AS result',
            [skuId, stock, adminId, reason || '管理员调整库存']
        );
        return rows[0].result;
    },

    async getAdminDashboard() {
        const rows = await query('SELECT get_admin_dashboard() AS result');
        return rows[0].result;
    },

    async listAdminUsers() {
        return query(
            `SELECT u.id, u.username, u.nickname, u.phone, u.role, u.status,
                    u.created_at, u.last_login_at,
                    COUNT(o.id)::int AS order_count
               FROM users u
               LEFT JOIN orders o ON o.user_id = u.id
              GROUP BY u.id
              ORDER BY u.created_at DESC`
        );
    },

    async getPublicUserProfile(username) {
        const rows = await query(
            `SELECT u.id,
                    u.username,
                    u.nickname,
                    u.role,
                    u.created_at,
                    COUNT(DISTINCT o.id)::int AS order_count,
                    COUNT(DISTINCT f.id)::int AS favorite_count
               FROM users u
               LEFT JOIN orders o ON o.user_id = u.id AND o.status <> '已取消'
               LEFT JOIN favorites f ON f.user_id = u.id
              WHERE u.username = $1
                AND u.status = 1
              GROUP BY u.id
              LIMIT 1`,
            [username]
        );
        return rows[0] || null;
    },

    async listUserLogs(limit = 200) {
        return query(
            `SELECT * FROM user_logs
              ORDER BY created_at DESC, id DESC
              LIMIT $1`,
            [Math.min(Math.max(Number(limit) || 200, 1), 1000)]
        );
    },

    async clearUserLogs() {
        return query('DELETE FROM user_logs WHERE id >= 0 RETURNING id');
    },

    async addUserLog(username, action, product = '') {
        const rows = await query(
            `INSERT INTO user_logs (username, action, product)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [username, action, product]
        );
        return rows[0];
    }
};

module.exports = repository;
