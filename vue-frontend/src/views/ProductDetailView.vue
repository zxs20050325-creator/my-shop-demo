<template>
  <div class="container">
    <router-link to="/" class="back-link" style="display: inline-block; padding: 10px 15px; background: transparent; color: #8b4c30; text-decoration: none; border-radius: 6px; margin-bottom: 20px; border: 1px solid #d9d2ca; transition: all 0.3s; font-size: 14px;">
      ← 返回首页
    </router-link>
    
    <div class="product-detail-container" style="background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(139, 76, 48, 0.08); border: none; display: flex; margin-bottom: 20px;">
      <div class="product-image" style="flex: 1; padding: 40px; background: #faf8f5;">
        <img :src="getImageUrl(product.img)" :alt="product.name" style="width: 100%; height: 400px; object-fit: contain; transition: transform 0.3s;" />
      </div>
      
      <div class="product-info" style="flex: 1; padding: 40px;">
        <h1 class="product-name">{{ product.name }}</h1>
        <div class="product-category" style="display: inline-block; padding: 6px 16px; background: #f0ebe5; color: #8a8681; border-radius: 30px; margin-bottom: 25px; font-size: 14px; border: 1px solid #d9d2ca;">{{ product.category }}</div>
        <div class="product-price" style="color: #8b4c30; font-size: 32px; font-weight: 500; margin-bottom: 20px; display: block;">¥{{ product.price }}</div>
        <p class="product-desc" style="color: #8a8681; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">{{ product.desc }}</p>
        
        <div class="btn-actions" style="display: flex; gap: 15px; margin-bottom: 15px;">
          <button class="btn-buy" @click="addToCart" style="flex: 1; padding: 15px; border: 1px solid #d9d2ca; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 400; transition: all 0.3s; background: transparent; color: #8b4c30;">加入购物车</button>
          <button class="btn-favorite" @click="toggleFavorite" style="flex: 1; background: transparent; color: #8a8681; border: 1px solid #d9d2ca; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 400; transition: all 0.3s;">❤️ 收藏商品</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProductDetailView',
  props: ['id'],
  data() {
    return {
      product: {}
    }
  },
  methods: {
    async fetchProductDetail() {
      try {
        // 获取所有产品以查找特定ID的产品
        const response = await fetch(`${this.$apiBase}/api/products?page=1`);
        const data = await response.json();
        
        let allProducts = [...data.items];
        if (data.totalPages > 1) {
          for (let i = 2; i <= data.totalPages; i++) {
            const res = await fetch(`${this.$apiBase}/api/products?page=${i}`);
            const pageData = await res.json();
            allProducts = allProducts.concat(pageData.items);
          }
        }
        
        this.product = allProducts.find(p => p.id == this.id) || {};
      } catch (error) {
        console.error('加载商品详情失败:', error);
      }
    },
    
    getImageUrl(imgPath) {
      const fileName = imgPath.split('/').pop();
      return `/images/${fileName}`;
    },
    
    async addToCart() {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${this.$apiBase}/api/cart/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, product: this.product })
        });
        
        const data = await response.json();
        if (data.success) {
          alert(`✅ [${this.product.name}] 已加入购物车！`);
        }
      } catch (error) {
        console.error('添加到购物车失败:', error);
        alert('添加失败');
      }
    },
    
    async toggleFavorite() {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${this.$apiBase}/api/favorites/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, product: this.product })
        });
        
        const data = await response.json();
        if (data.success) {
          alert(`✅ [${this.product.name}] 已收藏！`);
        } else {
          alert(data.message);
        }
      } catch (error) {
        console.error('收藏失败:', error);
        alert('收藏失败');
      }
    }
  },
  
  mounted() {
    this.fetchProductDetail();
  }
}
</script>