function sendSuccess(res, data, options = {}) {
    const body = {
        success: true,
        data,
        requestId: res.req.requestId
    };
    if (options.meta) body.meta = options.meta;
    return res.status(options.status || 200).json(body);
}

function sendError(res, error) {
    return res.status(error.status || 500).json({
        success: false,
        error: {
            code: error.code || 'INTERNAL_ERROR',
            message: error.message || '服务器内部错误',
            details: error.details
        },
        requestId: res.req.requestId
    });
}

module.exports = { sendSuccess, sendError };
