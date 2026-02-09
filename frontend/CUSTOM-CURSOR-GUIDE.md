# 自定义机械爪光标使用指南

## 📋 概述
本项目实现了基于"线上抓娃娃机/磁力吸取"隐喻的自定义光标效果，包含三个圆点组成的机械爪，在不同交互状态下展现不同的动画效果。

## 🔧 安装与集成

### 1. 文件结构
- `custom-cursor.css` - 光标样式文件
- `custom-cursor.js` - 光标逻辑文件

### 2. 在HTML页面中集成
在您的HTML页面的 `<head>` 部分添加CSS引用：
```html
<link rel="stylesheet" href="custom-cursor.css">
```

在页面底部（`</body>` 标签前）添加JS引用：
```html
<script src="custom-cursor.js"></script>
```

### 3. 自动识别的交互元素
光标会自动识别以下元素并应用交互效果：
- 所有 `<button>`, `<a>`, `<input>`, `<textarea>`, `<select>` 元素
- 带有 `.hover-target` 或 `.magnetic-target` 类的元素
- 带有 `[data-cursor="grab"]` 属性的元素
- 项目中特定的组件类（如 `.series-node`, `.cart-trigger`, `.auth-btn` 等）

## ⚙️ 自定义配置

### 禁用特定元素的光标效果
```html
<!-- 在不需要光标效果的元素上添加此属性 -->
<div data-cursor-disabled="true">这个元素不会有光标效果</div>
```

### JavaScript API
```javascript
// 禁用特定元素的光标效果
CustomCursor.disableOnElement(document.querySelector('.my-element'));

// 启用特定元素的光标效果
CustomCursor.enableOnElement(document.querySelector('.my-element'));

// 完全禁用自定义光标
CustomCursor.disable();

// 重新启用自定义光标
CustomCursor.enable();
```

## 📱 兼容性
- **桌面浏览器**：Chrome, Firefox, Safari, Edge (最新版本)
- **移动设备**：自动检测触屏设备并回退到系统默认光标
- **无障碍**：支持键盘导航，ESC键可退出特殊状态

## 🎯 交互效果说明
- **静止状态**：三个6px小圆点呈三角形排列，松散跟随鼠标
- **Hover状态**：圆点向中心收紧，模拟"准备抓取"姿态
- **Click状态**：三个圆点合体成24px大圆点，颜色变为鎏金色，模拟"抓起"动作

## 💡 注意事项
1. 确保页面已加载必要的CSS变量（`--c-primary`, `--c-accent`）
2. 触屏设备会自动禁用自定义光标以保证操作体验
3. 如果页面有大量动态内容，光标会自动监听新添加的交互元素
4. 如需完全禁用，可调用 `CustomCursor.disable()` 方法

## 🔄 更新日志
- **v1.0.0** - 初始版本，支持基础的三态光标效果
- **v1.0.1** - 添加触屏设备兼容性和动态元素监听
- **v1.0.2** - 优化性能，添加API控制方法