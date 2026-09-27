// 全站唯一的 HTTP 出口。
//
// 旧版 common.js 的问题是：加购、收藏、埋点全是「先写 localStorage，
// 再 fire-and-forget POST」——不 await、不看返回值、失败无感知，
// 于是本地和服务端必然分叉，多标签页/多设备一定不一致。
// 现在所有请求都从这里走，错误一律抛出，由调用方决定怎么提示。

const BASE = ''   // 同源。开发时由 Vite 的 server.proxy 转发到后端。

async function request(path, { method = 'GET', body, headers = {} } = {}) {
    const res = await fetch(BASE + path, {
        method,
        headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
        body: body ? JSON.stringify(body) : undefined
    })

    const text = await res.text()
    let data
    try { data = text ? JSON.parse(text) : null } catch { data = text }

    if (!res.ok) {
        const err = new Error((data && data.message) || `请求失败（HTTP ${res.status}）`)
        err.status = res.status
        err.data = data
        throw err
    }
    return data
}

const qs = (obj) => {
    const p = new URLSearchParams()
    Object.entries(obj).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') p.append(k, v)
    })
    const s = p.toString()
    return s ? `?${s}` : ''
}

export const api = {
    // ---- 商品 ----
    // params: { q, category, sort, page, pageSize }
    listProducts: (params = {}) => request('/api/products' + qs(params)),
    getProduct: (id) => request('/api/products/' + encodeURIComponent(id)),
    listCategories: () => request('/api/categories'),

    // ---- 账号 ----
    register: (username, password) => request('/api/register', { method: 'POST', body: { username, password } }),
    login: (username, password) => request('/api/login', { method: 'POST', body: { username, password } }),
    profile: (username) => request('/api/user/profile' + qs({ username })),
    changePassword: (username, oldPassword, newPassword) =>
        request('/api/user/change-password', { method: 'POST', body: { username, oldPassword, newPassword } }),

    // ---- 购物车 ----
    getCart: (username) => request('/api/cart' + qs({ username })),
    addToCart: (username, product, quantity = 1) =>
        request('/api/cart/add', { method: 'POST', body: { username, product, quantity } }),
    removeFromCart: (username, index) =>
        request('/api/cart/remove', { method: 'POST', body: { username, index } }),
    setCartQuantity: (username, index, quantity) =>
        request('/api/cart/quantity', { method: 'POST', body: { username, index, quantity } }),

    // ---- 收藏 ----
    getFavorites: (username) => request('/api/favorites' + qs({ username })),
    addToFavorites: (username, product) =>
        request('/api/favorites/add', { method: 'POST', body: { username, product } }),
    removeFromFavorites: (username, productId) =>
        request('/api/favorites/remove', { method: 'POST', body: { username, productId } }),

    // ---- 订单 ----
    checkout: (username, payload = {}) =>
        request('/api/cart/checkout', { method: 'POST', body: { username, ...payload } }),
    listOrders: (username) => request('/api/orders' + qs({ username })),
    getOrder: (id) => request('/api/orders/' + encodeURIComponent(id)),

    // ---- 埋点 ----
    // 埋点失败不该打断用户操作，所以调用方通常 .catch(() => {}) 忽略
    track: (username, action, product = '') =>
        request('/api/track', { method: 'POST', body: { username, action, product } }),

    // ---- 后台 ----
    adminLogin: (password) => request('/api/admin/login', { method: 'POST', body: { password } }),
    adminStats: (key) => request('/api/admin/stats', { headers: { 'x-admin-key': key } }),
    adminUsersData: (key) => request('/api/admin/users-data', { headers: { 'x-admin-key': key } }),
    adminProducts: (key) => request('/api/admin/products', { headers: { 'x-admin-key': key } }),
    adminCreateProduct: (key, product) =>
        request('/api/admin/products', { method: 'POST', body: product, headers: { 'x-admin-key': key } }),
    adminUpdateProduct: (key, id, product) =>
        request('/api/admin/products/' + id, { method: 'PUT', body: product, headers: { 'x-admin-key': key } }),
    adminToggleProduct: (key, id, active) =>
        request(`/api/admin/products/${id}/toggle`, { method: 'POST', body: { active }, headers: { 'x-admin-key': key } }),
    adminDeleteProduct: (key, id) =>
        request('/api/admin/products/' + id, { method: 'DELETE', headers: { 'x-admin-key': key } }),
    adminOrders: (key) => request('/api/admin/orders', { headers: { 'x-admin-key': key } }),
    adminClearLogs: (key) => request('/api/admin/clear', { method: 'POST', body: {}, headers: { 'x-admin-key': key } })
}

// 按路径拼商品图。后端存的 img 已经是 /images/xxx.jpg，
// 旧版 product-detail.html 会再拼一次前缀变成 /images//images/xxx.jpg 直接挂图。
export function imageUrl(path) {
    if (!path) return 'https://placehold.co/600x800?text=JIYI'
    if (/^https?:\/\//.test(path)) return path
    return path.startsWith('/') ? path : '/images/' + path
}
