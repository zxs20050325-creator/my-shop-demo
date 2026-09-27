class AppError extends Error {
    constructor(message, status = 400, code = 'BAD_REQUEST', details = undefined) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

class DatabaseError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'DatabaseError';
        this.cause = cause;
    }
}

const errors = {
    unauthorized: (message = '请先登录') =>
        new AppError(message, 401, 'UNAUTHORIZED'),
    forbidden: (message = '没有权限执行此操作') =>
        new AppError(message, 403, 'FORBIDDEN'),
    notFound: (message = '资源不存在') =>
        new AppError(message, 404, 'NOT_FOUND'),
    conflict: (message = '资源状态冲突') =>
        new AppError(message, 409, 'CONFLICT'),
    tooMany: (message = '请求过于频繁，请稍后重试') =>
        new AppError(message, 429, 'TOO_MANY_REQUESTS')
};

module.exports = { AppError, DatabaseError, errors };
