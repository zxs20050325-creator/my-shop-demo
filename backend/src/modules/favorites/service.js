const repository = require('../../database/repository');
const { yuanFromCents } = require('../../shared/security');
const { errors } = require('../../shared/errors');

function favoriteView(row) {
    const product = row.products;
    if (!product) return null;
    const activeSkus = (product.product_skus || []).filter(sku => Number(sku.active) === 1);
    const priceCents = activeSkus.length
        ? Math.min(...activeSkus.map(sku => Number(sku.price_cents || 0)))
        : 0;
    return {
        id: Number(row.id),
        productId: Number(row.product_id),
        createdAt: row.created_at,
        product: {
            id: Number(product.id),
            name: product.name,
            subtitle: product.subtitle || '',
            description: product.description || '',
            img: product.cover_img || product.img || '',
            category: product.category || '',
            status: Number(product.status ?? 1),
            priceCents,
            price: yuanFromCents(priceCents),
            stock: activeSkus.reduce((sum, sku) => sum + Number(sku.stock || 0), 0)
        }
    };
}

async function listFavorites(userId) {
    const rows = await repository.listFavorites(userId);
    return rows.map(favoriteView).filter(Boolean);
}

async function addFavorite(userId, productId) {
    const product = await repository.getProductById(productId);
    if (!product || Number(product.status) !== 1) throw errors.notFound('商品不存在或已下架');
    await repository.addFavorite(userId, productId);
    return listFavorites(userId);
}

async function removeFavorite(userId, productId) {
    await repository.removeFavorite(userId, productId);
    return listFavorites(userId);
}

module.exports = { listFavorites, addFavorite, removeFavorite };
