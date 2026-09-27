const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { requestContext } = require('./middleware/request');
const { authenticate } = require('./middleware/auth');
const { verifyOrigin } = require('./middleware/origin');
const { notFound, errorHandler } = require('./middleware/error');
const { writeLimiter } = require('./middleware/rateLimit');
const { sendSuccess } = require('./shared/response');

const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/users/routes');
const catalogRoutes = require('./modules/catalog/routes');
const cartRoutes = require('./modules/cart/routes');
const favoriteRoutes = require('./modules/favorites/routes');
const orderRoutes = require('./modules/orders/routes');
const adminRoutes = require('./modules/admin/routes');

const app = express();
app.set('trust proxy', 1);

app.use(requestContext);
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}));
app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = env.corsOrigin.split(',').map(item => item.trim());
        return callback(null, allowed.includes(origin));
    },
    credentials: true
}));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(cookieParser());
app.use(verifyOrigin);
app.use(authenticate);
app.use('/api', writeLimiter);

app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));

app.get('/health', (_req, res) => {
    sendSuccess(res, {
        status: 'ok',
        service: 'jiyi-zhumeng',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

app.get('/admin', (_req, res) => res.redirect('/#/admin'));

const distDir = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const hasDist = fs.existsSync(path.join(distDir, 'index.html'));

if (hasDist) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
    });
} else {
    app.get(/^\/(?!api\/).*/, (_req, res) => {
        res.status(503).type('text/plain; charset=utf-8').send(
            '前端构建产物缺失，请在 frontend 目录执行 npm run build。'
        );
    });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
