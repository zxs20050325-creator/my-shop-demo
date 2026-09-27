const repository = require('../../database/repository');
const { yuanFromCents } = require('../../shared/security');
const { errors } = require('../../shared/errors');

function cartItemView(row) {
    const sku = row.product_skus;
    const product = sku?.products;
    if (!sku || !product) return null;
    return {
        id: Number(row.id),
        quantity: Number(row.quantity || 1),
        selected: row.selected !== false,
        createdAt: row.created_at,
        sku: {
            id: Number(sku.id),
            skuCode: sku.sku_code,
            specValues: sku.spec_values || {},
            specText: sku.spec_text || '默认规格',
            priceCents: Number(sku.price_cents || 0),
            price: yuanFromCents(sku.price_cents),
            stock: Number(sku.stock || 0),
            active: Number(sku.active) === 1,
            product: {
                id: Number(product.id),
                name: product.name,
                subtitle: product.subtitle || '',
                img: product.cover_img || product.img || '',
                category: product.category || '',
                status: Number(product.status ?? 1)
            }
        }
    };
}

async function listCart(userId) {
    const rows = await repository.listCartItems(userId);
    const items = rows.map(cartItemView).filter(Boolean);
    const totalCents = items.reduce(
        (sum, item) => sum + item.sku.priceCents * item.quantity,
        0
    );
    return {
        items,
        totalCents,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
    };
}

async function addToCart(userId, skuId, quantity) {
    const sku = await repository.getSkuById(skuId);
    if (!sku || Number(sku.active) !== 1) throw errors.notFound('商品规格不存在或已下架');
    if (Number(sku.products?.status) !== 1) throw errors.conflict('商品已下架');
    if (Number(sku.stock) < quantity) throw errors.conflict('库存不足');

    const existing = await repository.findCartItem(userId, skuId);
    const nextQuantity = Math.min(99, Number(existing?.quantity || 0) + quantity);
    if (nextQuantity > Number(sku.stock)) throw errors.conflict('库存不足');

    if (existing) {
        await repository.updateCartItem(userId, existing.id, { quantity: nextQuantity });
    } else {
        await repository.createCartItem(userId, skuId, quantity);
    }
    return listCart(userId);
}

async function updateQuantity(userId, itemId, quantity) {
    const item = await repository.updateCartItem(userId, itemId, { quantity });
    if (!item) throw errors.notFound('购物车商品不存在');
    return listCart(userId);
}

async function setSelected(userId, itemId, selected) {
    const item = await repository.updateCartItem(userId, itemId, { selected });
    if (!item) throw errors.notFound('购物车商品不存在');
    return listCart(userId);
}

async function removeItem(userId, itemId) {
    const removed = await repository.deleteCartItem(userId, itemId);
    if (!removed) throw errors.notFound('购物车商品不存在');
    return listCart(userId);
}

async function clearCart(userId) {
    await repository.clearCart(userId);
    return { items: [], totalCents: 0, totalQuantity: 0 };
}

module.exports = { listCart, addToCart, updateQuantity, setSelected, removeItem, clearCart, cartItemView };
