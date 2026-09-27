const { AppError, DatabaseError } = require('../shared/errors');
const { sendError } = require('../shared/response');

function notFound(req, _res, next) {
    next(new AppError(`接口不存在：${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}

function normalizeError(error) {
    if (error instanceof AppError) return error;

    if (error?.name === 'ZodError') {
        const message = error.issues?.[0]?.message || '请求参数校验失败';
        return new AppError(message, 422, 'VALIDATION_ERROR', error.issues);
    }

    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
        return new AppError('登录状态已过期，请重新登录', 401, 'TOKEN_INVALID');
    }

    if (error instanceof DatabaseError || error?.name === 'DatabaseError') {
        const message = String(error.message || '');
        const map = [
            ['CART_EMPTY', 409, 'CART_EMPTY', '购物车为空'],
            ['ADDRESS_NOT_FOUND', 404, 'ADDRESS_NOT_FOUND', '收货地址不存在'],
            ['PRODUCT_OFF_SALE', 409, 'PRODUCT_OFF_SALE', '商品已下架'],
            ['STOCK_NOT_ENOUGH', 409, 'STOCK_NOT_ENOUGH', '商品库存不足'],
            ['ORDER_NOT_FOUND', 404, 'ORDER_NOT_FOUND', '订单不存在'],
            ['ORDER_STATUS_INVALID', 409, 'ORDER_STATUS_INVALID', '订单状态不允许此操作'],
            ['ORDER_STATUS_TRANSITION_INVALID', 409, 'ORDER_STATUS_TRANSITION_INVALID', '订单状态流转不合法'],
            ['ONLY_UNPAID_CAN_CANCEL', 409, 'ONLY_UNPAID_CAN_CANCEL', '只有待付款订单可以取消'],
            ['ORDER_NOT_PAID', 409, 'ORDER_NOT_PAID', '订单尚未付款'],
            ['ORDER_STATUS_NOT_REFUNDABLE', 409, 'ORDER_STATUS_NOT_REFUNDABLE', '当前订单状态不可退款'],
            ['REFUND_ALREADY_REQUESTED', 409, 'REFUND_ALREADY_REQUESTED', '已有待处理退款申请'],
            ['REFUND_NOT_FOUND', 404, 'REFUND_NOT_FOUND', '退款申请不存在'],
            ['REFUND_STATUS_INVALID', 409, 'REFUND_STATUS_INVALID', '退款申请状态不允许处理'],
            ['SKU_NOT_FOUND', 404, 'SKU_NOT_FOUND', '商品规格不存在'],
            ['STOCK_INVALID', 422, 'STOCK_INVALID', '库存数量不合法']
        ];
        const found = map.find(([key]) => message.includes(key));
        if (found) return new AppError(found[3], found[1], found[2]);
        return new AppError('数据库操作失败', 500, 'DATABASE_ERROR');
    }

    if (error?.code === '23505') {
        return new AppError('数据已存在', 409, 'DUPLICATE_RESOURCE');
    }
    if (error?.code === '23503') {
        return new AppError('关联数据不存在或仍被使用', 409, 'FOREIGN_KEY_ERROR');
    }

    return new AppError(error?.message || '服务器内部错误', 500, 'INTERNAL_ERROR');
}

function errorHandler(error, req, res, _next) {
    const normalized = normalizeError(error);
    if (normalized.status >= 500) {
        console.error(`[${req.requestId}]`, error);
    }
    return sendError(res, normalized);
}

module.exports = { notFound, errorHandler, normalizeError };
