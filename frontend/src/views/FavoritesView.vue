<script setup>
import { onMounted } from 'vue'
import ProductCard from '../components/ProductCard.vue'
import { useFavoritesStore } from '../stores/favorites'

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
            <p>{{ favorites.error }}</p>
            <button class="btn-reveal-all" @click="favorites.load()">重试</button>
        </div>
        <div v-else-if="!favorites.products.length" class="empty-state">
            <i class="fa fa-heart-o"></i>
            <h3>珍藏夹还是空的</h3>
            <RouterLink to="/"><button class="btn-reveal-all">去逛逛</button></RouterLink>
        </div>
        <div v-else class="product-grid">
            <ProductCard v-for="product in favorites.products" :key="product.id" :product="product" />
        </div>
    </section>
</template>
