<template>
  <div id="app">
    <nav class="navbar">
      <div class="brand-logo">🏛️ 冀遗筑梦</div>
      <div class="nav-links" id="auth-section">
        <span v-if="currentUser">欢迎, {{ currentUser }}</span>
        <router-link to="/">首页</router-link>
        <router-link to="/cart" v-if="currentUser">🛒 购物车</router-link>
        <router-link to="/favorites" v-if="currentUser">❤️ 收藏</router-link>
        <router-link to="/login" v-if="!currentUser">登录</router-link>
        <router-link to="/register" v-if="!currentUser">注册</router-link>
        <a href="#" @click.prevent="logout" v-if="currentUser">退出</a>
      </div>
    </nav>

    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App',
  computed: {
    currentUser() {
      return localStorage.getItem('currentUser');
    }
  },
  methods: {
    logout() {
      localStorage.removeItem('currentUser');
      this.$router.push('/');
    }
  }
}
</script>

<style>
* { 
  margin: 0; 
  padding: 0; 
  box-sizing: border-box; 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; 
}

body { 
  background: #f9f7f4; 
  padding-top: 80px; 
  color: #5a5651; 
}

.navbar {
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100%;
  background: rgba(250, 247, 242, 0.95); 
  backdrop-filter: blur(10px);
  color: #5a5651; 
  padding: 15px 30px;
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(139, 76, 48, 0.05); 
  border-bottom: 1px solid rgba(139, 76, 48, 0.05); 
}

.brand-logo { 
  font-size: 22px; 
  font-weight: 400; 
  color: #8b4c30; 
  letter-spacing: 0.5px;
  font-family: 'Georgia', serif; 
}

.nav-links a { 
  color: #8a8681; 
  text-decoration: none; 
  margin-left: 20px; 
  font-size: 15px;
  transition: color 0.3s;
}

.nav-links a:hover { 
  color: #8b4c30; 
}

.container { 
  max-width: 1200px; 
  margin: 0 auto; 
  padding: 20px; 
}

.page-title { 
  text-align: center; 
  margin-bottom: 40px; 
  color: #5a5651; 
}

.page-title h2 { 
  font-size: 32px; 
  font-weight: 300; 
  margin-bottom: 10px; 
  letter-spacing: 0.5px;
  color: #5a5651; 
  font-family: 'Georgia', serif; 
}

.page-title p { 
  color: #a89f96; 
  font-size: 16px; 
  font-weight: 300;
}

/* 商品网格 */
.product-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
  gap: 60px; 
  padding: 0 20px;
}

.product-card { 
  background: #fff; 
  border-radius: 8px; 
  overflow: hidden; 
  box-shadow: 0 4px 15px rgba(139, 76, 48, 0.08); 
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  position: relative;
  border: none; 
  display: flex;
  flex-direction: column;
}

.product-card:hover { 
  transform: translateY(-5px); 
  box-shadow: 0 8px 25px rgba(139, 76, 48, 0.12); 
}

.product-img { 
  width: 100%; 
  height: 220px;
  object-fit: contain;
  background-color: #faf8f5; 
  padding: 25px;
  transition: transform 0.3s;
}

.product-card:hover .product-img {
  transform: scale(1.02);
}

.card-body { 
  padding: 20px; 
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.product-name { 
  font-size: 18px; 
  font-weight: 400; 
  margin-bottom: 10px; 
  color: #5a5651; 
  line-height: 1.4;
  cursor: pointer;
}

.product-name:hover {
  color: #8b4c30;
}

.product-price { 
  color: #8b4c30; 
  font-size: 20px; 
  font-weight: 500; 
  margin-bottom: 15px; 
  display: block;
}

.product-desc { 
  color: #8a8681; 
  font-size: 14px; 
  line-height: 1.5; 
  margin-bottom: 20px; 
  height: 42px; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  display: -webkit-box; 
  -webkit-line-clamp: 2; 
  -webkit-box-orient: vertical; 
  flex-grow: 1;
}

.btn-actions { 
  display: flex;
  gap: 10px;
}

.btn-buy, 
.btn-favorite { 
  flex: 1;
  padding: 12px; 
  border: 1px solid #d9d2ca; 
  border-radius: 6px; 
  cursor: pointer; 
  font-size: 16px; 
  font-weight: 400;
  transition: all 0.3s;
}

.btn-buy { 
  background: transparent; 
  color: #8b4c30; 
}

.btn-buy:hover { 
  background: #f0ebe5; 
  border-color: #c9b7ac; 
}

.btn-favorite { 
  background: transparent; 
  color: #8a8681; 
}

.btn-favorite:hover { 
  background: #f0ebe5; 
  border-color: #c9b7ac; 
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #bfb8b1; 
  font-size: 18px;
}

.empty-state i {
  font-size: 60px;
  display: block;
  margin-bottom: 20px;
  color: #e8e2db; 
}

@media (max-width: 768px) {
  .navbar {
    padding: 15px;
  }
  
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    padding: 0 10px;
    gap: 40px; 
  }
  
  .page-title h2 {
    font-size: 26px;
  }
}
</style>
