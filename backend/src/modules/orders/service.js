const repository = require('../../database/repository');
const { yuanFromCents } = require('../../shared/security');
const { errors } = require('../../shared/errors');

function orderItemView(item) {
    return {
        id: Number(item.id),
        productId: item.product_id ? Number(item.product_id) : null,
        skuId: item.sku_id ? Number(item.sku_id) : null,
        name: item.product_name || item.name || '未知商品',
        specText: item.sku_spec_text || '默认规格',
        img: item.product_img || item.img || '',
        priceCents: Number(item.price_cents || 0),
        price: yuanFromCents(item.price_cents),
        quantity: Number(item.quantity || 1),
        subtotalCents: Number(item.subtotal_cents || 0),
        subtotal: yuanFromCents(item.subtotal_cents)
    };
}

function refundView(refund) {
    return {
        id: Number(refund.id),
        orderId: Number(refund.order_id),
        reason: refund.reason,
        amountCents: Number(refund.amount_cents || 0),
        amount: yuanFromCents(refund.amount_cents),
        status: refund.status,
        adminNote: refund.admin_note || '',
        appliedAt: refund.applied_at,
        handledAt: refund.handled_at
    };
}

function orderView(order, details = false) {
    const result = {
        id: Number(order.id),
        orderNo: order.order_no,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        amountCents: Number(order.payable_amount_cents || 0),
        amount: yuanFromCents(order.payable_amount_cents),
        createdAt: order.created_at,
        paidAt: order.paid_at,
        shippedAt: order.shipped_at,
        completedAt: order.completed_at,
        cancelledAt: order.cancelled_at,
        cancelReason: order.cancel_reason || '',
        actions: {
            canPay: order.status === '待付款',
            canCancel: order.status === '待付款',
            canRequestRefund: ['paid', 'refund_rejected'].includes(order.payment_status)
                && ['待发货', '已发货'].includes(order.status)
        }
    };

    if (details) {
        result.receiver = {
            name: order.receiver_name || '',
            phone: order.receiver_phone || '',
            province: order.receiver_province || '',
            city: order.receiver_city || '',
            district: order.receiver_district || '',
            detail: order.receiver_detail || ''
        };
        result.remark = order.remark || '';
        result.items = (order.order_items || []).map(orderItemView);
        result.refunds = (order.refund_requests || []).map(refundView);
    } else {
        result.items = (order.order_items || []).map(orderItemView);
    }
    return result;
}

async function createOrder(userId, payload) {
    const result = await repository.createOrderFromCart(
        userId,
        payload.addressId,
        payload.paymentMethod
    );
    return {
        orderId: Number(result.id),
        orderNo: result.orderNo,
        totalCents: Number(result.totalCents || 0),
        total: yuanFromCents(result.totalCents),
        itemCount: Number(result.itemCount || 0),
        status: result.status
    };
}

async function listOrders(userId, query) {
    const result = await repository.listOrders({
        userId,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize
    });
    return {
        items: result.items.map(order => orderView(order)),
        total: result.total,
        page: query.page,
        pageSize: query.pageSize
    };
}

async function getOrder(userId, orderId, admin = false) {
    const order = await repository.getOrderById(orderId, admin ? null : userId);
    if (!order) throw errors.notFound('订单不存在');
    const details = orderView(order, true);
    details.statusLogs = await repository.listOrderStatusLogs(orderId);
    return details;
}

async function payOrder(userId, orderId, method) {
    const result = await repository.demoPayOrder(orderId, userId, method);
    return {
        orderId: Number(result.orderId),
        status: result.status,
        transactionNo: result.transactionNo
    };
}

async function cancelOrder(userId, orderId, reason) {
    const result = await repository.cancelUnpaidOrder(orderId, userId, reason);
    return { orderId: Number(result.orderId), status: result.status };
}

async function requestRefund(userId, orderId, reason) {
    const result = await repository.requestRefund(orderId, userId, reason);
    return { refundId: Number(result.refundId), status: result.status };
}

async function listRefunds(userId, query) {
    const result = await repository.listRefunds({
        userId,
        page: query.page,
        pageSize: query.pageSize
    });
    return {
        items: result.items.map(item => ({
            ...refundView(item),
            orderNo: item.orders?.order_no || '',
            orderStatus: item.orders?.status || ''
        })),
        total: result.total
    };
}

module.exports = {
    createOrder,
    listOrders,
    getOrder,
    payOrder,
    cancelOrder,
    requestRefund,
    listRefunds,
    orderView,
    orderItemView,
    refundView
};
