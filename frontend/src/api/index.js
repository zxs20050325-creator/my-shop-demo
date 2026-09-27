const BASE = '';

export class ApiError extends Error {
    constructor(message, status, code, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

async function request(path, { method = 'GET', body, headers = {} } = {}, allowRefresh = true) {
    const res = await fetch(BASE + path, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let payload = null;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = text;
    }

    if (!res.ok) {
        const refreshExcluded = [
            '/auth/login',
            '/auth/register',
            '/auth/refresh',
            '/auth/logout'
        ].some(item => path.includes(item));
        if (res.status === 401 && allowRefresh && !refreshExcluded) {
            const refreshed = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include'
            });
            if (refreshed.ok) {
                return request(path, { method, body, headers }, false);
            }
        }
        const error = new ApiError(
            payload?.error?.message || `请求失败（HTTP ${res.status}）`,
            res.status,
            payload?.error?.code || 'HTTP_ERROR',
            payload?.error?.details
        );
        if (res.status === 401 && !path.includes('/auth/login')) {
            window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        throw error;
    }

    return payload?.data ?? payload;
}

const qs = (obj) => {
    const params = new URLSearchParams();
    Object.entries(obj || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });
    const query = params.toString();
    return query ? `?${query}` : '';
};

export const api = {
    auth: {
        register: async (payload) =>
            (await request('/api/auth/register', { method: 'POST', body: payload })).user,
        login: async (payload) =>
            (await request('/api/auth/login', { method: 'POST', body: payload })).user,
        refresh: async () =>
            (await request('/api/auth/refresh', { method: 'POST' })).user,
        logout: () => request('/api/auth/logout', { method: 'POST' }),
        me: async () => (await request('/api/auth/me')).user
    },

    listProducts: async (params = {}) => {
        const res = await fetch('/api/products' + qs(params), { credentials: 'include' });
        const payload = await res.json();
        if (!res.ok) throw new ApiError(payload?.error?.message, res.status, payload?.error?.code);
        return {
            items: payload.data?.items || [],
            total: payload.meta?.total || 0,
            page: payload.meta?.page || 1,
            pageSize: payload.meta?.pageSize || 12
        };
    },
    getProduct: (id) => request('/api/products/' + encodeURIComponent(id)),
    listCategories: () => request('/api/categories'),
    getPublicUser: (username) =>
        request('/api/users/' + encodeURIComponent(username) + '/public'),
    track: (action, product = '') =>
        request('/api/track', { method: 'POST', body: { action, product } }).catch(() => null),

    cart: {
        list: () => request('/api/cart'),
        add: (skuId, quantity = 1) =>
            request('/api/cart/items', { method: 'POST', body: { skuId, quantity } }),
        update: (itemId, patch) =>
            request('/api/cart/items/' + itemId, { method: 'PATCH', body: patch }),
        remove: (itemId) =>
            request('/api/cart/items/' + itemId, { method: 'DELETE' }),
        clear: () => request('/api/cart', { method: 'DELETE' })
    },

    favorites: {
        list: () => request('/api/favorites'),
        add: (productId) =>
            request('/api/favorites', { method: 'POST', body: { productId } }),
        remove: (productId) =>
            request('/api/favorites/' + productId, { method: 'DELETE' })
    },

    users: {
        updateProfile: (payload) => request('/api/users/me', { method: 'PATCH', body: payload }),
        changePassword: (oldPassword, newPassword) =>
            request('/api/users/me/password', {
                method: 'POST',
                body: { oldPassword, newPassword }
            }),
        listAddresses: () => request('/api/users/me/addresses'),
        createAddress: (payload) =>
            request('/api/users/me/addresses', { method: 'POST', body: payload }),
        updateAddress: (id, payload) =>
            request('/api/users/me/addresses/' + id, { method: 'PUT', body: payload }),
        setDefaultAddress: (id) =>
            request(`/api/users/me/addresses/${id}/default`, { method: 'POST' }),
        deleteAddress: (id) =>
            request('/api/users/me/addresses/' + id, { method: 'DELETE' })
    },

    orders: {
        create: (payload) => request('/api/orders', { method: 'POST', body: payload }),
        list: (params = {}) => request('/api/orders' + qs(params)),
        get: (id) => request('/api/orders/' + encodeURIComponent(id)),
        pay: (id, method = 'wechat') =>
            request(`/api/orders/${id}/demo-pay`, { method: 'POST', body: { method } }),
        cancel: (id, reason = '用户取消') =>
            request(`/api/orders/${id}/cancel`, { method: 'POST', body: { reason } }),
        requestRefund: (id, reason) =>
            request(`/api/orders/${id}/refunds`, { method: 'POST', body: { reason } }),
        listRefunds: (params = {}) => request('/api/orders/refunds' + qs(params))
    },

    admin: {
        dashboard: () => request('/api/admin/dashboard'),
        products: (params = {}) => request('/api/admin/products' + qs(params)),
        createProduct: (payload) =>
            request('/api/admin/products', { method: 'POST', body: payload }),
        updateProduct: (id, payload) =>
            request('/api/admin/products/' + id, { method: 'PUT', body: payload }),
        createSku: (productId, payload) =>
            request(`/api/admin/products/${productId}/skus`, { method: 'POST', body: payload }),
        updateSku: (id, payload) =>
            request('/api/admin/skus/' + id, { method: 'PUT', body: payload }),
        adjustStock: (id, stock, reason = '管理员调整库存') =>
            request(`/api/admin/skus/${id}/stock`, {
                method: 'POST',
                body: { stock, reason }
            }),
        orders: (params = {}) => request('/api/admin/orders' + qs(params)),
        order: (id) => request('/api/admin/orders/' + id),
        updateOrderStatus: (id, status, remark = '') =>
            request(`/api/admin/orders/${id}/status`, {
                method: 'PATCH',
                body: { status, remark }
            }),
        refunds: (params = {}) => request('/api/admin/refunds' + qs(params)),
        handleRefund: (id, approve, note = '') =>
            request('/api/admin/refunds/' + id, {
                method: 'PATCH',
                body: { approve, note }
            }),
        users: () => request('/api/admin/users'),
        logs: (limit = 200) => request('/api/admin/logs' + qs({ limit })),
        clearLogs: () => request('/api/admin/logs', { method: 'DELETE' })
    }
};

export function imageUrl(path) {
    if (!path) return '/images/001.jpg';
    if (/^https?:\/\//.test(path)) return path;
    return path.startsWith('/') ? path : '/images/' + path;
}
