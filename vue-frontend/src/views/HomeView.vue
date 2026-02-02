<template>
  <div class="container">
    <div class="page-title">
      <h2>河北非遗珍品</h2>
      <p>传承千年文化，感受匠心之美</p>
    </div>

    <div class="search-container" style="display: flex; justify-content: center; margin-bottom: 30px;">
      <div class="search-wrapper" style="position: relative; display: flex; align-items: center; max-width: 500px; width: 100%;">
        <input
          type="text"
          v-model="searchQuery"
          @input="performSearch"
          placeholder="🔍 搜索非遗商品..."
          class="form-control"
          style="width: 100%; padding: 14px 20px 14px 45px; border: 1px solid #d9d2ca; border-radius: 30px; font-size: 16px; background: #faf8f5; color: #5a5651; transition: all 0.3s;"
        />
        <button
          @click="performSearch"
          class="btn-search"
          style="position: absolute; right: 5px; background: #8b4c30; color: white; border: none; padding: 8px 20px; border-radius: 30px; cursor: pointer; transition: all 0.3s;"
        >
          搜索
        </button>
      </div>
    </div>

    <div class="categories" style="display: flex; justify-content: center; margin-bottom: 30px; flex-wrap: wrap; gap: 10px;">
      <button
        v-for="category in uniqueCategories"
        :key="category"
        @click="filterByCategory(category)"
        class="category-btn"
        :class="{ active: selectedCategory === category }"
        style="padding: 8px 16px; margin: 5px; border: 1px solid #d9d2ca; border-radius: 30px; background: #f0ebe5; color: #8a8681; cursor: pointer; transition: all 0.3s;"
      >
        {{ category }}
      </button>
    </div>

    <div v-if="filteredProducts.length === 0" class="empty-state">
      <i>🛍️</i>
      <p>没有找到符合条件的商品</p>
    </div>

    <div v-else class="product-grid" id="product-list">
      <div v-for="product in filteredProducts" :key="product.id" class="product-card">
        <img :src="getImageUrl(product.img)" :alt="product.name" class="product-img" @click="viewProductDetail(product.id)" style="cursor: pointer;" />
        <div class="card-body">
          <div class="product-name" @click="viewProductDetail(product.id)">{{ product.name }}</div>
          <div class="product-price">¥{{ product.price }}</div>
          <div class="product-desc">{{ product.desc }}</div>
          <div class="btn-actions">
            <button class="btn-buy" @click="addToCart(product)">加入购物车</button>
            <button class="btn-favorite" @click="toggleFavorite(product)">❤️</button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="showLoadMore" class="load-more-container" style="text-align: center; margin-top: 30px;">
      <button @click="loadMore" class="btn-load-more" style="padding: 12px 30px; background: #f0ebe5; color: #8b4c30; border: 1px solid #d9d2ca; border-radius: 6px; cursor: pointer; transition: all 0.3s;">加载更多</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeView',
  data() {
    return {
      products: [],
      allProducts: [],
      currentPage: 1,
      searchQuery: '',
      selectedCategory: '全部',
      uniqueCategories: ['全部']
    }
  },
  computed: {
    filteredProducts() {
      let result = this.products;
      
      // 应用搜索过滤
      if (this.searchQuery) {
        result = result.filter(product =>
          product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          product.desc.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      }
      
      // 应用分类过滤
      if (this.selectedCategory !== '全部') {
        result = result.filter(product => product.category === this.selectedCategory);
      }
      
      return result;
    },
    showLoadMore() {
      // 如果还有更多产品可以加载，则显示加载更多按钮
      return this.allProducts.length > this.products.length;
    }
  },
  methods: {
    async fetchProducts() {
      try {
        const response = await fetch(`${this.$apiBase}/api/products?page=${this.currentPage}`);
        const data = await response.json();
        
        // 如果是第一页，获取所有产品用于搜索和分类
        if (this.currentPage === 1) {
          this.fetchAllProducts();
        }
        
        // 合并新获取的产品
        this.products = [...this.products, ...data.items];
      } catch (error) {
        console.error('获取产品失败:', error);
      }
    },
    
    async fetchAllProducts() {
      try {
        // 获取所有产品用于搜索和分类
        const response = await fetch(`${this.$apiBase}/api/products?page=1`);
        const data = await response.json();
        let allProducts = [...data.items];
        
        // 获取其他页的产品
        if (data.totalPages > 1) {
          for (let i = 2; i <= data.totalPages; i++) {
            const res = await fetch(`${this.$apiBase}/api/products?page=${i}`);
            const pageData = await res.json();
            allProducts = allProducts.concat(pageData.items);
          }
        }
        
        this.allProducts = allProducts;
        
        // 获取唯一的分类
        const categories = [...new Set(allProducts.map(p => p.category))];
        this.uniqueCategories = ['全部', ...categories];
      } catch (error) {
        console.error('获取所有产品失败:', error);
      }
    },
    
    getImageUrl(imgPath) {
      // 处理图片路径，去掉开头的路径部分，保留文件名
      const fileName = imgPath.split('/').pop();
      return `/images/${fileName}`;
    },
    
    async addToCart(product) {
      const user = localStorage.getItem('currentUser');
      if (!user) {
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
        if (data.success) {
          alert(`✅ [${product.name}] 已加入购物车！`);
        }
      } catch (error) {
        console.error('添加到购物车失败:', error);
        alert('添加失败');
      }
    },
    
    async toggleFavorite(product) {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${this.$apiBase}/api/favorites/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, product })
        });
        
        const data = await response.json();
        if (data.success) {
          alert(`✅ [${product.name}] 已收藏！`);
        } else {
          alert(data.message);
        }
      } catch (error) {
        console.error('收藏失败:', error);
        alert('收藏失败');
      }
    },
    
    viewProductDetail(productId) {
      this.$router.push(`/product/${productId}`);
    },
    
    performSearch() {
      // 搜索已经在computed属性中处理
    },
    
    filterByCategory(category) {
      this.selectedCategory = category;
    },
    
    loadMore() {
      this.currentPage++;
      this.fetchProducts();
    }
  },
  
  async mounted() {
    this.fetchProducts();
  }
}
</script>