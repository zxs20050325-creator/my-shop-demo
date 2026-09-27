const repository = require('../../database/repository');
const { yuanFromCents } = require('../../shared/security');
const { errors } = require('../../shared/errors');

function skuView(sku) {
    return {
        id: Number(sku.id),
        productId: Number(sku.product_id),
        skuCode: sku.sku_code,
        specValues: sku.spec_values || {},
        specText: sku.spec_text || '默认规格',
        priceCents: Number(sku.price_cents || 0),
        price: yuanFromCents(sku.price_cents),
        stock: Number(sku.stock || 0),
        active: Number(sku.active) === 1
    };
}

function productSummary(product) {
    return {
        id: Number(product.id),
        name: product.name,
        subtitle: product.subtitle || '',
        description: product.description || '',
        img: product.img || product.cover_img || '',
        category: product.category || '',
        priceCents: Number(product.priceCents || 0),
        price: yuanFromCents(product.priceCents),
        stock: Number(product.stock || 0),
        salesCount: Number(product.salesCount || 0),
        status: Number(product.status ?? 1)
    };
}

function productDetail(product) {
    const allSkus = (product.product_skus || []).map(skuView);
    const activeSkus = allSkus.filter(sku => sku.active);
    if (!activeSkus.length) throw errors.notFound('商品暂无可售规格');

    return {
        id: Number(product.id),
        name: product.name,
        subtitle: product.subtitle || '',
        description: product.description || '',
        img: product.cover_img || product.img || '',
        category: product.categories?.name || product.category || '',
        categoryId: product.category_id ? Number(product.category_id) : null,
        status: Number(product.status ?? 1),
        priceCents: Math.min(...activeSkus.map(sku => sku.priceCents)),
        price: yuanFromCents(Math.min(...activeSkus.map(sku => sku.priceCents))),
        stock: activeSkus.reduce((sum, sku) => sum + sku.stock, 0),
        salesCount: Number(product.sales_count || 0),
        skus: activeSkus
    };
}

async function listProducts(params) {
    const data = await repository.searchProducts(params);
    const row = Array.isArray(data) ? data[0] : data;
    return {
        items: (row?.items || []).map(productSummary),
        total: Number(row?.total || 0),
        page: Number(params.page || 1),
        pageSize: Number(params.pageSize || 12)
    };
}

async function getProduct(productId) {
    const product = await repository.getProductById(productId);
    if (!product || Number(product.status) !== 1) throw errors.notFound('商品不存在或已下架');
    return productDetail(product);
}

async function listCategories() {
    const data = await repository.getCategories();
    return (data || []).map(item => ({
        category: item.category,
        count: Number(item.cnt || 0)
    }));
}

async function track(user, action, product = '') {
    const safeAction = String(action || '').trim().slice(0, 60);
    if (!safeAction) throw errors.conflict('行为类型不能为空');
    const username = user?.username || '游客';
    await repository.addUserLog(username, safeAction, String(product || '').slice(0, 120));
    return { tracked: true };
}

async function getPublicUser(username) {
    const user = await repository.getPublicUserProfile(username);
    if (!user) throw errors.notFound('用户不存在');
    const joinedDays = Math.max(
        1,
        Math.ceil((Date.now() - new Date(user.created_at).getTime()) / (24 * 60 * 60 * 1000))
    );
    return {
        id: Number(user.id),
        username: user.username,
        nickname: user.nickname || user.username,
        role: user.role,
        createdAt: user.created_at,
        orderCount: Number(user.order_count || 0),
        favoriteCount: Number(user.favorite_count || 0),
        joinedDays
    };
}

module.exports = {
    listProducts,
    getProduct,
    listCategories,
    track,
    getPublicUser,
    skuView
};
