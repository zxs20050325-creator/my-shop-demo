/**
 * 自定义机械爪光标效果
 * 适用于冀遗筑梦项目的所有页面
 */

class CustomCursor {
    constructor() {
        this.cursorDots = null;
        this.cursorDot1 = null;
        this.cursorDot2 = null;
        this.cursorDot3 = null;
        this.isHovering = false;
        this.isClicking = false;
        this.currentElement = null;
        this.isTouchDevice = false;
        
        // 检测是否为触屏设备
        this.detectTouchDevice();
        
        if (!this.isTouchDevice) {
            this.init();
        }
    }
    
    detectTouchDevice() {
        this.isTouchDevice = ('ontouchstart' in window) || 
                           (navigator.maxTouchPoints > 0) ||
                           (navigator.msMaxTouchPoints > 0);
    }
    
    init() {
        // 创建光标元素
        this.createCursorElements();
        
        // 监听鼠标移动
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        
        // 监听可交互元素
        this.setupInteractiveElements();
        
        // 添加键盘支持（ESC键退出特殊状态）
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    createCursorElements() {
        // 检查是否已存在光标元素
        if (document.querySelector('.cursor-dot')) {
            return;
        }
        
        const cursorHTML = `
            <div class="cursor-dot cursor-dot-1"></div>
            <div class="cursor-dot cursor-dot-2"></div>
            <div class="cursor-dot cursor-dot-3"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', cursorHTML);
        
        this.cursorDot1 = document.querySelector('.cursor-dot-1');
        this.cursorDot2 = document.querySelector('.cursor-dot-2');
        this.cursorDot3 = document.querySelector('.cursor-dot-3');
        this.cursorDots = document.querySelectorAll('.cursor-dot');
        
        // 启用自定义光标
        document.body.classList.add('custom-cursor-enabled');
    }
    
    setupInteractiveElements() {
        // 定义可交互元素的选择器
        const interactiveSelectors = [
            'button', 'a', 'input', 'textarea', 'select',
            '.hover-target', '.magnetic-target', '[data-cursor="grab"]',
            '.series-node', '.cart-trigger', '.auth-btn', '.search-engine',
            '.product-card', '.btn-reveal-all', '.page-node'
        ].join(', ');
        
        // 为现有元素添加事件监听
        document.querySelectorAll(interactiveSelectors).forEach(element => {
            this.addCursorEvents(element);
        });
        
        // 使用MutationObserver监听动态添加的元素
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node;
                        if (element.matches && element.matches(interactiveSelectors)) {
                            this.addCursorEvents(element);
                        }
                        // 检查子元素
                        if (element.querySelectorAll) {
                            element.querySelectorAll(interactiveSelectors).forEach(child => {
                                this.addCursorEvents(child);
                            });
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    addCursorEvents(element) {
        // 避免重复添加事件
        if (element.hasAttribute('data-cursor-initialized')) {
            return;
        }
        
        element.setAttribute('data-cursor-initialized', 'true');
        
        element.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        element.addEventListener('mousedown', this.handleMouseDown.bind(this));
        element.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    handleMouseMove(e) {
        if (!e) return;
        
        const x = e.clientX;
        const y = e.clientY;
        
        // 更新CSS变量
        document.documentElement.style.setProperty('--mouse-x', `${x}px`);
        document.documentElement.style.setProperty('--mouse-y', `${y}px`);
        
        // 如果正在点击，保持合体状态
        if (this.isClicking) {
            this.setCursorClick();
        } else if (this.isHovering) {
            this.setCursorHover();
        }
    }
    
    handleMouseEnter(e) {
        if (!e.target.hasAttribute('data-cursor-disabled')) {
            this.isHovering = true;
            this.currentElement = e.target;
            this.setCursorHover();
        }
    }
    
    handleMouseLeave(e) {
        this.isHovering = false;
        this.currentElement = null;
        this.setCursorDefault();
    }
    
    handleMouseDown(e) {
        this.isClicking = true;
        this.setCursorClick();
        
        // 添加点击反馈动画
        setTimeout(() => {
            this.isClicking = false;
            if (this.isHovering) {
                this.setCursorHover();
            } else {
                this.setCursorDefault();
            }
        }, 150);
    }
    
    handleMouseUp(e) {
        // 点击释放后恢复状态
        if (!this.isClicking) {
            if (this.isHovering) {
                this.setCursorHover();
            } else {
                this.setCursorDefault();
            }
        }
    }
    
    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.isHovering = false;
            this.isClicking = false;
            this.currentElement = null;
            this.setCursorDefault();
        }
    }
    
    setCursorDefault() {
        document.body.classList.remove('cursor-hover', 'cursor-click');
    }
    
    setCursorHover() {
        document.body.classList.add('cursor-hover');
        document.body.classList.remove('cursor-click');
    }
    
    setCursorClick() {
        document.body.classList.add('cursor-click');
        document.body.classList.remove('cursor-hover');
    }
    
    // 公共方法：禁用特定元素的光标效果
    static disableOnElement(element) {
        if (element) {
            element.setAttribute('data-cursor-disabled', 'true');
        }
    }
    
    // 公共方法：启用特定元素的光标效果
    static enableOnElement(element) {
        if (element) {
            element.removeAttribute('data-cursor-disabled');
        }
    }
    
    // 公共方法：完全禁用自定义光标
    static disable() {
        document.body.classList.remove('custom-cursor-enabled');
        const cursorDots = document.querySelectorAll('.cursor-dot');
        cursorDots.forEach(dot => dot.remove());
    }
    
    // 公共方法：重新启用自定义光标
    static enable() {
        new CustomCursor();
    }
}

// 自动初始化
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // 检查是否已经初始化
        if (!window.customCursorInstance) {
            window.customCursorInstance = new CustomCursor();
        }
    });
    
    // 提供全局访问
    window.CustomCursor = CustomCursor;
}