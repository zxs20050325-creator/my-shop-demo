<template>
  <div class="container">
    <div class="page-title">
      <h2>我的购物车</h2>
      <p>您添加的商品</p>
    </div>

    <div v-if="cartItems.length === 0" class="empty-cart" style="text-align: center; padding: 60px 20px; color: #bfb8b1; font-size: 18px;">
      <i>🛒</i>
      <p>您的购物车还是空的<br>快去首页挑选心仪的商品吧！</p>
      <router-link to="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: transparent; color: #8b4c30; text-decoration: none; border: 1px solid #d9d2ca; border-radius: 6px; transition: all 0.3s;">前往首页</router-link>
    </div>

    <div v-else class="cart-container" style="background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(139, 76, 48, 0.08); border: none; padding: 30px; margin-bottom: 30px;">
      <div id="cart-items">
        <div v-for="(item, index) in cartItems" :key="index" class="cart-item" style="display: flex; padding: 20px 0; border-bottom: 1px solid #f0ebe5;">
          <img :src="getImageUrl(item.img)" :alt="item.name" class="item-image" style="width: 120px; height: 120px; object-fit: contain; background: #faf8f5; padding: 15px; border-radius: 4px;" />
          <div class="item-details" style="flex: 1; padding: 0 20px; display: flex; flex-direction: column; justify-content: center;">
            <div class="item-name" style="font-size: 18px; font-weight: 400; color: #5a5651; margin-bottom: 8px;">{{ item.name }}</div>
            <div class="item-price" style="color: #8b4c30; font-size: 20px; font-weight: 500;">¥{{ item.price }}</div>
          </div>
          <div class="item-actions" style="display: flex; align-items: center; gap: 15px;">
            <div class="quantity-control" style="display: flex; align-items: center; border: 1px solid #d9d2ca; border-radius: 6px;">
              <button class="quantity-btn" @click="updateQuantity(index, -1)" style="background: transparent; border: none; padding: 8px 15px; font-size: 18px; color: #8a8681; cursor: pointer; transition: all 0.3s;">-</button>
              <div class="quantity-display" style="padding: 8px 10px; min-width: 40px; text-align: center; color: #5a5651;">{{ item.quantity }}</div>
              <button class="quantity-btn" @click="updateQuantity(index, 1)" style="background: transparent; border: none; padding: 8px 15px; font-size: 18px; color: #8a8681; cursor: pointer; transition: all 0.3s;">+</button>
            </div>
            <button class="remove-btn" @click="removeFromCart(index)" style="background: transparent; border: 1px solid #d9d2ca; color: #8a8681; padding: 8px 15px; border-radius: 6px; cursor: pointer; transition: all 0.3s;">删除</button>
          </div>
        </div>
      </div>
      
      <div class="cart-summary" style="display: flex; justify-content: space-between; padding: 20px 0; border-top: 1px solid #f0ebe5; margin-top: 10px; font-size: 18px;">
        <div>总计:</div>
        <div class="total-price" id="total-price" style="color: #8b4c30; font-size: 24px; font-weight: 500;">¥{{ totalPrice }}</div>
      </div>
      
      <button class="checkout-btn" @click="proceedToCheckout" style="padding: 15px 30px; background: transparent; color: #8b4c30; border: 1px solid #d9d2ca; border-radius: 6px; font-size: 18px; font-weight: 400; cursor: pointer; transition: all 0.3s; width: 100%; margin-top: 20px;">去结算</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CartView',
  data() {
    return {
      cartItems: []
    }
  },
  computed: {
    totalPrice() {
      return this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
  },
  methods: {
    async loadCart() {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${this.$apiBase}/api/cart?username=${user}`);
        this.cartItems = await response.json();
      } catch (error) {
        console.error('加载购物车失败:', error);
      }
    },

    async updateQuantity(index, change) {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }

      if (this.cartItems[index]) {
        const newQty = this.cartItems[index].quantity + change;

        if (newQty <= 0) {
          await this.removeFromCart(index);
          return;
        }

        this.cartItems[index].quantity = newQty;
      }
    },

    async removeFromCart(index) {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }

      if (!confirm('确定要从购物车中删除这件商品吗？')) {
        return;
      }

      try {
        await fetch(`${this.$apiBase}/api/cart/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, index })
        });
        
        this.loadCart();
      } catch(error) {
        console.error('删除失败:', error);
      }
    },

    async proceedToCheckout() {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }

      if (this.cartItems.length === 0) {
        alert('购物车不能为空！');
        return;
      }

      this.$router.push(`/pay?total=${this.totalPrice}`);
    },
    
    getImageUrl(imgPath) {
      const fileName = imgPath.split('/').pop();
      return `/images/${fileName}`;
    }
  },
  
  mounted() {
    this.loadCart();
  }
}
</script>