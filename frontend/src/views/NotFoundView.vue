<script setup>
import { useRouter } from 'vue-router'

// 旧版没有 404 页 —— 打错的地址会落到后端 Express 的 JSON 404 上，
// 用户看到的是一屏 {"error":"Not Found"} 纯文本。
// hash 模式的兜底路由现在会渲染这一页。

const router = useRouter()
</script>

<template>
    <section class="page-section">
        <div class="nf">
            <div class="nf-num">404</div>
            <h2>此处无藏品</h2>
            <p>你找的页面不存在，或者已经被撤展了。</p>
            <div class="nf-actions">
                <button class="btn-reveal-all" @click="router.push('/')">回到首页</button>
                <button class="btn-outline" @click="router.back()">返回上一页</button>
            </div>
        </div>
    </section>
</template>

<style scoped>
.nf { text-align: center; padding: 90px 20px 120px; }
.nf-num {
    font-family: var(--f-mono); font-size: 132px; font-weight: 900;
    color: transparent; -webkit-text-stroke: 2px var(--c-primary);
    line-height: 1; opacity: 0.28; margin-bottom: 26px;
}
.nf h2 { font-size: 30px; font-weight: 900; letter-spacing: 6px; margin-bottom: 14px; }
.nf p { color: var(--c-ink-soft); font-size: 14px; margin-bottom: 40px; }
.nf-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
</style>
