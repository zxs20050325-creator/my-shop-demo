const { AppError } = require('../shared/errors');

function validate(schemas = {}) {
    return function validationMiddleware(req, _res, next) {
        try {
            for (const key of ['body', 'query', 'params']) {
                if (!schemas[key]) continue;
                const result = schemas[key].safeParse(req[key]);
                if (!result.success) {
                    const details = result.error.issues.map(issue => ({
                        path: issue.path.join('.'),
                        message: issue.message
                    }));
                    throw new AppError('请求参数校验失败', 422, 'VALIDATION_ERROR', details);
                }
                req[key] = result.data;
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { validate };
