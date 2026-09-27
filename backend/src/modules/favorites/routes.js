const express = require('express');
const { z } = require('zod');
const service = require('./service');
const { asyncHandler } = require('../../middleware/async');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { sendSuccess } = require('../../shared/response');

const router = express.Router();
router.use(requireAuth);

router.get('/',
    asyncHandler(async (req, res) =>
        sendSuccess(res, { items: await service.listFavorites(req.user.id) })
    )
);

router.post('/',
    validate({ body: z.object({ productId: z.coerce.number().int().positive() }) }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { items: await service.addFavorite(req.user.id, req.body.productId) }, { status: 201 })
    )
);

router.delete('/:productId',
    validate({ params: z.object({ productId: z.coerce.number().int().positive() }) }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { items: await service.removeFavorite(req.user.id, req.params.productId) })
    )
);

module.exports = router;
