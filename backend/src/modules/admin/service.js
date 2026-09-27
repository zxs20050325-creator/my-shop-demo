const repository = require('../../database/repository');
const { yuanFromCents } = require('../../shared/security');
const { errors } = require('../../shared/errors');
const { orderView, orderItemView, refundView } = require('../orders/service');
const { skuView } = require('../catalog/service');

function adminProductView(product) {
    const skus = (product.product_skus || []).map(skuView);
    const activeSkus = skus.filter(sku => sku.active);
    const priceCents = activeSkus.length
        ? Math.min(...activeSkus.map(sku => sku.priceCents))
        : 0;
    return {
        id: Number(product.id),
        name: product.name,
        subtitle: product.subtitle || '',
        description: product.description || '',
        img: product.cover_img || product.img || '',
        category: product.categories?.name || product.category || '',
        categoryId: product.category_id ? Number(product.category_id) : null,
        status: Number(product.status ?? 1),
        active: Number(product.active ?? product.status ?? 1),
        priceCents,
        price: yuanFromCents(priceCents),
        stock: skus.reduce((sum, sku) => sum + sku.stock, 0),
        salesCount: Number(product.sales_count || 0),
        skus
    };
}

async function dashboard() {
    const data = await repository.getAdminDashboard();
    const dashboard = Array.isArray(data) ? data[0] : data;
    return {
        kpi: {
            revenue: yuanFromCents(dashboard?.kpi?.revenueCents),
            revenueCents: Number(dashboard?.kpi?.revenueCents || 0),
            orders: Number(dashboard?.kpi?.orders || 0),
            visits: Number(dashboard?.kpi?.visits || 0),
            activeUsers: Number(dashboard?.kpi?.activeUsers || 0),
            pendingShipment: Number(dashboard?.kpi?.pendingShipment || 0),
            pendingRefunds: Number(dashboard?.kpi?.pendingRefunds || 0)
        },
        trend: (dashboard?.trend || []).map(item => ({
            date: item.date,
            orders: Number(item.orders || 0),
            revenueCents: Number(item.revenueCents || 0),
            revenue: yuanFromCents(item.revenueCents)
        })),
        topProducts: (dashboard?.topProducts || []).map(item => ({
            name: item.name,
            sales: Number(item.sales || 0)
        }))
    };
}

async function listProducts(query) {
    const result = await repository.listAdminProducts(query);
    return {
        items: result.items.map(adminProductView),
        total: result.total
    };
}

async function createProduct(payload) {
    const category = await repository.ensureCategory(payload.category);
    const product = await repository.createProduct({
        ...payload,
        categoryId: category?.id || null,
        priceCents: payload.sku?.priceCents || 0
    });
    await repository.createSku(product.id, {
        skuCode: payload.sku?.skuCode || `P${product.id}-DEFAULT`,
        specValues: {},
        specText: payload.sku?.specText || '默认规格',
        priceCents: payload.sku?.priceCents || 0,
        stock: payload.sku?.stock || 0,
        active: payload.status ?? 1
    });
    return adminProductView(await repository.getProductById(product.id));
}

async function updateProduct(productId, payload) {
    const category = payload.category ? await repository.ensureCategory(payload.category) : null;
    const product = await repository.updateProduct(productId, {
        ...payload,
        categoryId: category?.id
    });
    if (!product) throw errors.notFound('商品不存在');
    return adminProductView(await repository.getProductById(productId));
}

async function createSku(productId, payload) {
    const product = await repository.getProductById(productId);
    if (!product) throw errors.notFound('商品不存在');
    return skuView(await repository.createSku(productId, payload));
}

async function updateSku(skuId, payload) {
    const sku = await repository.updateSku(skuId, payload);
    if (!sku) throw errors.notFound('SKU 不存在');
    return skuView(sku);
}

async function adjustStock(skuId, stock, adminId, reason) {
    return repository.adjustStock(skuId, stock, adminId, reason);
}

async function listOrders(query) {
    const result = await repository.listOrders(query);
    return {
        items: result.items.map(order => ({
            ...orderView(order),
            username: order.username,
            receiverPhone: order.receiver_phone,
            receiverAddress: [
                order.receiver_province,
                order.receiver_city,
                order.receiver_district,
                order.receiver_detail
            ].filter(Boolean).join(' ')
        })),
        total: result.total
    };
}

async function getOrder(orderId) {
    const order = await repository.getOrderById(orderId);
    if (!order) throw errors.notFound('订单不存在');
    return {
        ...orderView(order, true),
        username: order.username,
        statusLogs: await repository.listOrderStatusLogs(orderId)
    };
}

async function updateOrderStatus(orderId, status, adminId, remark) {
    const result = await repository.adminUpdateOrderStatus(orderId, status, adminId, remark);
    return { orderId: Number(result.orderId), status: result.status };
}

async function listRefunds(query) {
    const result = await repository.listRefunds(query);
    return {
        items: result.items.map(item => ({
            ...refundView(item),
            orderNo: item.orders?.order_no || '',
            orderStatus: item.orders?.status || '',
            username: item.orders?.username || ''
        })),
        total: result.total
    };
}

async function handleRefund(refundId, adminId, approve, note) {
    const result = await repository.handleRefund(refundId, adminId, approve, note);
    return { refundId: Number(result.refundId), status: result.status };
}

async function listUsers() {
    const users = await repository.listAdminUsers();
    return users.map(user => ({
        id: Number(user.id),
        username: user.username,
        nickname: user.nickname || '',
        phone: user.phone || '',
        role: user.role,
        status: Number(user.status || 0),
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        orderCount: Number(user.order_count || 0)
    }));
}

async function listLogs(limit) {
    const logs = await repository.listUserLogs(limit);
    return logs.map(log => ({
        id: Number(log.id),
        time: log.created_at,
        username: log.username,
        action: log.action,
        product: log.product || ''
    }));
}

async function clearLogs() {
    await repository.clearUserLogs();
    return { cleared: true };
}

module.exports = {
    dashboard,
    listProducts,
    createProduct,
    updateProduct,
    createSku,
    updateSku,
    adjustStock,
    listOrders,
    getOrder,
    updateOrderStatus,
    listRefunds,
    handleRefund,
    listUsers,
    listLogs,
    clearLogs,
    adminProductView
};
