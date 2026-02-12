/**
 * 冀遗筑梦 - 公共JavaScript工具库
 * 包含跨页面共享的通用函数和工具方法
 */

// ========================================
// 1. 状态管理工具
// ========================================

/**
 * 获取本地存储的用户信息
 * @returns {string|null} 用户名或null
 */
function getCurrentUser() {
    return localStorage.getItem('jiyi_user');
}

/**
 * 设置当前用户
 * @param {string} username - 用户名
 */
function setCurrentUser(username) {
    if (username) {
        localStorage.setItem('jiyi_user', username);
    } else {
        localStorage.removeItem('jiyi_user');
    }
}

/**
 * 获取购物车数据
 * @returns {Array} 购物车商品数组
 */
function getCartData() {
    try {
        const cart = localStorage.getItem('jiyi_cart');
        return cart ? JSON.parse(cart) : [];
    } catch (e) {
        console.error('购物车数据解析错误:', e);
        return [];
    }
}

/**
 * 设置购物车数据
 * @param {Array} cart - 购物车商品数组
 */
function setCartData(cart) {
    try {
        localStorage.setItem('jiyi_cart', JSON.stringify(cart));
    } catch (e) {
        console.error('购物车数据保存错误:', e);
    }
}

/**
 * 清空购物车
 */
function clearCart() {
    localStorage.removeItem('jiyi_cart');
}

/**
 * 获取收藏夹数据
 * @returns {Array} 收藏夹商品ID数组
 */
function getFavoritesData() {
    try {
        const favorites = localStorage.getItem('jiyi_favorites');
        return favorites ? JSON.parse(favorites) : [];
    } catch (e) {
        console.error('收藏夹数据解析错误:', e);
        return [];
    }
}

/**
 * 设置收藏夹数据
 * @param {Array} favorites - 收藏夹商品ID数组
 */
function setFavoritesData(favorites) {
    try {
        localStorage.setItem('jiyi_favorites', JSON.stringify(favorites));
    } catch (e) {
        console.error('收藏夹数据保存错误:', e);
    }
}

// ========================================
// 2. UI工具函数
// ========================================

/**
 * 显示非阻塞式通知
 * @param {string} message - 通知消息
 * @param {number} duration - 显示时长（毫秒），默认2000ms
 */
function showToast(message, duration = 2000) {
    // 查找现有的toast元素
    let toast = document.getElementById('toastNotification');
    if (!toast) {
        // 创建toast元素
        toast = document.createElement('div');
        toast.id = 'toastNotification';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(47, 72, 66, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            font-family: var(--f-serif);
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    
    // 更新内容并显示
    toast.innerText = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
    
    // 自动隐藏
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
    }, duration);
}

/**
 * 统一页面跳转函数
 * @param {string} url - 目标URL
 * @param {boolean} showToast - 是否显示跳转提示
 */
function navigateTo(url, showToast = false) {
    if (showToast) {
        showToast('页面跳转中...');
        setTimeout(() => {
            window.location.href = url;
        }, 500);
    } else {
        window.location.href = url;
    }
}

/**
 * 切换模态框显示状态
 * @param {string} modalId - 模态框ID
 */
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    }
}

/**
 * 关闭所有模态框
 */
function closeAllModals() {
    const modals = document.querySelectorAll('.modal, #loginModal, #cartDrawer, #drawerMask');
    modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('open', 'active');
    });
}

// ========================================
// 3. API工具函数
// ========================================

/**
 * 获取API基础URL
 * @returns {string} API基础URL
 */
function getApiBase() {
    // 根据部署环境动态设置API地址
    if (window.location.hostname.includes('onrender.com')) {
        return 'https://jiyi-zhumeng.onrender.com';
    }
    // 开发环境默认使用相对路径
    return '';
}

/**
 * 安全地构建图片URL
 * @param {string} imagePath - 图片路径
 * @returns {string} 完整的图片URL
 */
function buildImageUrl(imagePath) {
    if (!imagePath) {
        return 'https://placehold.co/200';
    }
    
    // 如果已经是完整URL，直接返回
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    
    // 构建相对于API的图片路径
    const apiBase = getApiBase();
    return apiBase ? `${apiBase}/images/${imagePath}` : `./images/${imagePath}`;
}

/**
 * 记录用户行为到后端
 * @param {string} action - 行为类型
 * @param {string} product - 商品信息（可选）
 */
async function trackUserAction(action, product = null) {
    const currentUser = getCurrentUser() || '游客';
    const apiBase = getApiBase();
    
    try {
        await fetch(`${apiBase}/api/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser,
                action: action,
                product: product
            })
        });
    } catch (error) {
        console.error('记录用户行为失败:', error);
    }
}

/**
 * 同步购物车到后端
 * @param {Object} product - 商品对象
 * @param {number} quantity - 数量
 */
async function syncCartToBackend(product, quantity = 1) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    const apiBase = getApiBase();
    try {
        const response = await fetch(`${apiBase}/api/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser,
                product: product
            })
        });
        return response.ok;
    } catch (error) {
        console.error('同步购物车失败:', error);
        return false;
    }
}

/**
 * 同步收藏到后端
 * @param {Object} product - 商品对象
 */
async function syncFavoriteToBackend(product) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    const apiBase = getApiBase();
    try {
        const response = await fetch(`${apiBase}/api/favorites/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser,
                product: product
            })
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('同步收藏失败:', error);
        return false;
    }
}

// ========================================
// 4. 购物车相关工具函数
// ========================================

/**
 * 添加商品到购物车（支持数量）
 * @param {Object} product - 商品对象
 * @param {number} quantity - 商品数量，默认为1
 * @param {Function} onSuccess - 成功回调
 */
function addToCart(product, quantity = 1, onSuccess = null) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('请先登录');
        setTimeout(() => {
            navigateTo('login.html');
        }, 1500);
        return false;
    }
    
    const cart = getCartData();
    
    // 检查商品是否已存在
    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex >= 0) {
        // 商品已存在，增加数量
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + quantity;
    } else {
        // 新商品，设置数量
        const newProduct = {...product};
        newProduct.quantity = quantity;
        cart.push(newProduct);
    }
    
    setCartData(cart);
    
    if (onSuccess) {
        onSuccess(product, quantity);
    }
    
    updateCartCount();
    return true;
}

/**
 * 从购物车移除商品
 * @param {number} index - 商品索引
 */
function removeFromCart(index) {
    const cart = getCartData();
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        setCartData(cart);
        updateCartCount();
        return true;
    }
    return false;
}

/**
 * 更新商品数量
 * @param {number} index - 商品索引
 * @param {number} newQuantity - 新数量
 */
function updateCartItemQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
        return removeFromCart(index);
    }
    
    const cart = getCartData();
    if (index >= 0 && index < cart.length) {
        cart[index].quantity = newQuantity;
        setCartData(cart);
        updateCartCount();
        return true;
    }
    return false;
}

/**
 * 获取购物车总价
 * @returns {number} 总价
 */
function getCartTotal() {
    const cart = getCartData();
    return cart.reduce((total, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return total + (price * quantity);
    }, 0);
}

/**
 * 更新购物车数量显示
 */
function updateCartCount() {
    const cart = getCartData();
    const count = cart.length;
    
    // 更新所有显示购物车数量的元素
    document.querySelectorAll('#cartBadge, #floatingCartCount').forEach(el => {
        if (el) {
            el.textContent = count;
        }
    });
}

// ========================================
// 5. 事件监听器工具
// ========================================

/**
 * 添加点击外部区域关闭功能
 * @param {HTMLElement} targetElement - 目标元素
 * @param {Function} onCloseCallback - 关闭回调函数
 */
function addClickOutsideHandler(targetElement, onCloseCallback) {
    function handleClickOutside(event) {
        if (targetElement && !targetElement.contains(event.target)) {
            onCloseCallback();
        }
    }
    
    document.addEventListener('click', handleClickOutside);
    return handleClickOutside; // 返回处理器以便后续移除
}

/**
 * 移除点击外部区域关闭处理器
 * @param {Function} handler - 处理器函数
 */
function removeClickOutsideHandler(handler) {
    document.removeEventListener('click', handler);
}

// ========================================
// 6. 初始化函数
// ========================================

/**
 * 初始化公共功能
 */
function initCommonFeatures() {
    // 添加全局点击外部关闭支持（如果存在相关元素）
    const cartDrawer = document.getElementById('cartDrawer');
    const drawerMask = document.getElementById('drawerMask');
    
    if (cartDrawer && drawerMask) {
        addClickOutsideHandler(cartDrawer, () => {
            cartDrawer.classList.remove('open');
            drawerMask.classList.remove('active');
        });
    }
    
    // 添加ESC键关闭模态框支持
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // 页面加载时更新购物车数量
    updateCartCount();
}

// 同步用户会话状态
function syncSession() {
    const currentUser = localStorage.getItem('jiyi_user');
    const authSection = document.getElementById('authSection');
    if (authSection) {
        if (currentUser) {
            authSection.innerHTML = `${currentUser} / SIGN OUT`;
            authSection.onclick = () => {
                if (confirm('确定要登出吗？')) {
                    localStorage.removeItem('jiyi_user');
                    localStorage.removeItem('jiyi_cart');
                    showToast('已登出');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            };
        } else {
            authSection.innerHTML = "SIGN IN / JOIN";
            authSection.onclick = () => {
                window.location.href = 'login.html';
            };
        }
    }
}

// 显示提示信息
function showToast(message) {
    // 创建或获取现有的toast元素
    let toast = document.getElementById('toastNotification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNotification';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(47, 72, 66, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            font-family: var(--f-serif);
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    
    // 设置消息并显示
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
    
    // 2秒后自动隐藏
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
    }, 2000);
}

// 购物车跳转函数
function goToCart() {
    const cart = JSON.parse(localStorage.getItem('jiyi_cart') || '[]');
    if (cart.length === 0) {
        showToast('购物车为空');
        return;
    }
    window.location.href = 'cart.html';
}

// 全局购物车数量更新函数
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('jiyi_cart') || '[]');
    const count = cart.length;

    // 更新所有显示购物车数量的元素
    document.querySelectorAll('#cartBadge, #floatingCartCount').forEach(el => {
        el.textContent = count;
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    syncSession();
    updateCartCount();
    
    // 绑定购物车按钮事件
    const cartTrigger = document.getElementById('cartTrigger');
    if (cartTrigger) {
        cartTrigger.onclick = goToCart;
    }
});
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('jiyi_cart') || '[]');
    const count = cart.length;

    // 关键修正：先判断元素是否存在，再赋值
    const badge = document.getElementById('cartBadge');
    const floatCount = document.getElementById('floatingCartCount');
    
    if (badge) badge.textContent = count;
    if (floatCount) floatCount.textContent = count;
}