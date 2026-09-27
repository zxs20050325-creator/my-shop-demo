const express = require('express');
const { z } = require('zod');
const service = require('./service');
const { asyncHandler } = require('../../middleware/async');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { loginLimiter, registerLimiter } = require('../../middleware/rateLimit');
const { sendSuccess } = require('../../shared/response');

const router = express.Router();

const username = z.string().trim().min(3, '用户名至少 3 位').max(32, '用户名最多 32 位')
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/, '用户名只能包含中文、字母、数字、下划线或横线');
const password = z.string().min(6, '密码至少 6 位').max(72, '密码最多 72 位');

router.post('/register',
    registerLimiter,
    validate({
        body: z.object({
            username,
            password,
            nickname: z.string().trim().max(32).optional().default('')
        })
    }),
    asyncHandler(async (req, res) => {
        const user = await service.register(req.body, req, res);
        return sendSuccess(res, { user }, { status: 201 });
    })
);

router.post('/login',
    loginLimiter,
    validate({
        body: z.object({ username, password })
    }),
    asyncHandler(async (req, res) => {
        const user = await service.login(req.body, req, res);
        return sendSuccess(res, { user });
    })
);

router.post('/refresh',
    asyncHandler(async (req, res) => {
        const user = await service.refresh(req, res);
        return sendSuccess(res, { user });
    })
);

router.post('/logout',
    asyncHandler(async (req, res) => {
        return sendSuccess(res, await service.logout(req, res));
    })
);

router.get('/me',
    requireAuth,
    asyncHandler(async (req, res) => {
        return sendSuccess(res, { user: await service.me(req.user.id) });
    })
);

module.exports = router;
