const express = require('express');
const { z } = require('zod');
const service = require('./service');
const { asyncHandler } = require('../../middleware/async');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { sendSuccess } = require('../../shared/response');

const router = express.Router();
router.use(requireAuth);

const addressSchema = z.object({
    recipient: z.string().trim().min(1, '请填写收货人').max(40),
    phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
    province: z.string().trim().max(30).optional().default(''),
    city: z.string().trim().max(30).optional().default(''),
    district: z.string().trim().max(30).optional().default(''),
    detail: z.string().trim().min(5, '详细地址至少 5 个字符').max(200),
    postalCode: z.string().trim().max(12).optional().default(''),
    isDefault: z.boolean().optional().default(false)
});

router.patch('/me',
    validate({
        body: z.object({
            nickname: z.string().trim().max(32).optional(),
            phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号').or(z.literal('')).optional()
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { user: await service.updateProfile(req.user.id, req.body) })
    )
);

router.post('/me/password',
    validate({
        body: z.object({
            oldPassword: z.string().min(1),
            newPassword: z.string().min(6).max(72)
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.changePassword(
            req.user.id,
            req.body.oldPassword,
            req.body.newPassword
        ))
    )
);

router.get('/me/addresses',
    asyncHandler(async (req, res) =>
        sendSuccess(res, { items: await service.listAddresses(req.user.id) })
    )
);

router.post('/me/addresses',
    validate({ body: addressSchema }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { address: await service.createAddress(req.user.id, req.body) }, { status: 201 })
    )
);

router.put('/me/addresses/:id',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: addressSchema
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { address: await service.updateAddress(req.user.id, req.params.id, req.body) })
    )
);

router.post('/me/addresses/:id/default',
    validate({ params: z.object({ id: z.coerce.number().int().positive() }) }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { address: await service.setDefaultAddress(req.user.id, req.params.id) })
    )
);

router.delete('/me/addresses/:id',
    validate({ params: z.object({ id: z.coerce.number().int().positive() }) }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.deleteAddress(req.user.id, req.params.id))
    )
);

module.exports = router;
