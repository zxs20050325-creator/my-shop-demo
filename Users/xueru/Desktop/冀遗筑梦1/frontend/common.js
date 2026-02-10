// 同步用户会话状态
function syncSession() {
    const currentUser = localStorage.getItem('jiyi_user');
    const authSection = document.getElementById('authSection');
    if (currentUser) {
        authSection.innerHTML = `${currentUser} / SIGN OUT`;
        authSection.onclick = () => {
            if (confirm('确定要登出吗？')) {
                localStorage.removeItem('jiyi_user');
                localStorage.removeItem('jiyi_cart');
                showToast('已登出');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        };
    } else {
        authSection.innerHTML = "SIGN IN / JOIN";
        authSection.onclick = () => {
            showToast('请先登录');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        };
    }
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
});