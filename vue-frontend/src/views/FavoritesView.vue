<template>
  <div class="container">
    <div class="page-title">
      <h2>我的收藏</h2>
      <p>您收藏的非遗宝贝</p>
    </div>

    <div v-if="favorites.length === 0" class="empty-favorites" style="text-align: center; padding: 80px 20px; color: #bfb8b1; font-size: 18px;">
      <i>❤️</i>
      <p>您的收藏夹还是空的<br>快去首页发现喜欢的非遗宝贝吧！</p>
      <router-link to="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: transparent; color: #8b4c30; text-decoration: none; border: 1px solid #d9d2ca; border-radius: 6px; transition: all 0.3s;">前往首页</router-link>
    </div>

    <div v-else class="product-grid" id="favorites-list">
      <div v-for="product in favorites" :key="product.id" class="product-card">
        <div class="favorite-icon" @click="removeFromFavorites(product.id)" style="position: absolute; top: 15px; right: 15px; font-size: 24px; color: #8b4c30; cursor: pointer; z-index: 10; transition: transform 0.3s; background: rgba(250, 247, 242, 0.9); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          ❤️
        </div>
        <img :src="getImageUrl(product.img)" :alt="product.name" class="product-img" @click="viewProductDetail(product.id)" style="cursor: pointer;" />
        <div class="card-body">
          <div class="product-name" @click="viewProductDetail(product.id)">{{ product.name }}</div>
          <div class="product-price">¥{{ product.price }}</div>
          <div class="product-desc">{{ product.desc }}</div>
          <div class="btn-actions">
            <button class="btn-buy" @click="addToCart(product)">加入购物车</button>
            <button class="btn-remove" @click="removeFromFavorites(product.id)">移除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FavoritesView',
  data() {
    return {
      favorites: []
    }
  },
  methods: {
    async loadFavorites() {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${this.$apiBase}/api/favorites?username=${user}`);
        this.favorites = await response.json();
      } catch (error) {
        console.error('加载收藏失败:', error);
      }
    },

    async removeFromFavorites(productId) {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${this.$apiBase}/api/favorites/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, productId })
        });
        const data = await response.json();
        
        if(data.success) {
          this.loadFavorites();
        }
      } catch(error) {
        console.error('移除收藏失败:', error);
      }
    },

    async addToCart(product) {
      const user = localStorage.getItem('currentUser');
      if(!user) {
        this.$router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${this.$apiBase}/api/cart/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, product })
        });
        const data = await response.json();
        if(data.success) {
          alert(`✅ [${product.name}] 已加入购物车！`);
        }
      } catch(error) {
        console.error('添加失败:', error);
        alert('添加失败');
      }
    },
    
    viewProductDetail(productId) {
      this.$router.push(`/product/${productId}`);
    },
    
    getImageUrl(imgPath) {
      const fileName = imgPath.split('/').pop();
      return `/images/${fileName}`;
    }
  },
  
  mounted() {
    this.loadFavorites();
  }
}
</script>