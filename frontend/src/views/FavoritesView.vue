<script setup>
import { onMounted } from 'vue'
import ProductCard from '../components/ProductCard.vue'
import { useFavoritesStore } from '../stores/favorites'

// 珍藏夹。旧版 favorites.html 的**唯一入口**在 product-detail.html 里，
// 而那个页面全站没有任何链接指向它 —— 于是两个页面一起变成了死页面。
// 现在入口在侧边栏和顶栏用户菜单里，点得进来。

const favorites = useFavoritesStore()

onMounted(() => favorites.load())
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>珍藏夹</h2>
            <span class="en">SAVED COLLECTION // {{ favorites.count }} ITEMS</span>
            <div class="rule"></div>
        </div>

        <div v-if="favorites.loading" class="loading-line">正在取回珍藏…</div>

        <div v-else-if="favorites.error" class="empty-state">
            <i class="fa fa-exclamation-triangle"></i>
            <h3>珍藏夹没能取回来</h3>
            <p>{{ favorites.error }}</p>
            <button class="btn-reveal-all" @click="favorites.load()">重试</button>
        </div>

        <div v-else-if="!favorites.items.length" class="empty-state">
            <i class="fa fa-heart-o"></i>
            <h3>珍藏夹还空着</h3>
            <p>在藏品卡片或详情页点一下心形，把它收进来</p>
            <RouterLink to="/"><button class="btn-reveal-all">去逛逛</button></RouterLink>
        </div>

        <div v-else class="product-grid">
            <ProductCard v-for="p in favorites.items" :key="p.id" :product="p" />
        </div>
    </section>
</template>

<style scoped>
.loading-line { padding: 80px 0; text-align: center; font-family: var(--f-mono); font-size: 13px; opacity: 0.5; }
</style>
