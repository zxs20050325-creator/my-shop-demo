<template>
  <div class="container">
    <div class="page-title">
      <h2>订单支付</h2>
      <p>请选择支付方式完成付款</p>
    </div>

    <div v-if="!paymentSuccess" class="payment-container" id="payment-form" style="background: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(139, 76, 48, 0.08); border: none; padding: 40px; margin-bottom: 30px;">
      <div class="order-summary" style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #f0ebe5;">
        <div class="order-total" style="display: flex; justify-content: space-between; font-size: 24px; font-weight: 500; color: #8b4c30;">
          <span>订单总额:</span>
          <span id="order-total">¥{{ orderTotal }}</span>
        </div>
      </div>
      
      <div class="payment-methods" style="margin-bottom: 30px;">
        <div class="method-option" 
             :class="{ selected: selectedMethod === 'wechat' }" 
             @click="selectPaymentMethod('wechat')" 
             style="display: flex; align-items: center; padding: 15px; border: 1px solid #d9d2ca; border-radius: 6px; margin-bottom: 10px; cursor: pointer; transition: all 0.3s;">
          <input type="radio" name="payment" value="wechat" v-model="selectedMethod" style="margin-right: 12px;">
          <span>微信支付</span>
        </div>
        
        <div class="method-option" 
             :class="{ selected: selectedMethod === 'alipay' }" 
             @click="selectPaymentMethod('alipay')" 
             style="display: flex; align-items: center; padding: 15px; border: 1px solid #d9d2ca; border-radius: 6px; margin-bottom: 10px; cursor: pointer; transition: all 0.3s;">
          <input type="radio" name="payment" value="alipay" v-model="selectedMethod" style="margin-right: 12px;">
          <span>支付宝</span>
        </div>
        
        <div class="method-option" 
             :class="{ selected: selectedMethod === 'card' }" 
             @click="selectPaymentMethod('card')" 
             style="display: flex; align-items: center; padding: 15px; border: 1px solid #d9d2ca; border-radius: 6px; margin-bottom: 10px; cursor: pointer; transition: all 0.3s;">
          <input type="radio" name="payment" value="card" v-model="selectedMethod" style="margin-right: 12px;">
          <span>银行卡支付</span>
        </div>
      </div>
      
      <button class="btn-pay" @click="processPayment" style="width: 100%; padding: 16px; background: transparent; color: #8b4c30; border: 1px solid #d9d2ca; border-radius: 6px; font-size: 18px; font-weight: 400; cursor: pointer; transition: all 0.3s;">确认支付</button>
    </div>
    
    <div v-if="paymentSuccess" class="payment-success" style="text-align: center; padding: 40px 20px; color: #10b981; display: block;">
      <i style="font-size: 60px; display: block; margin-bottom: 20px;">✅</i>
      <h3>支付成功！</h3>
      <p>感谢您的购买，我们会尽快安排发货。</p>
      <router-link to="/" style="color: #8b4c30; text-decoration: none;">返回首页继续购物</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PayView',
  data() {
    return {
      selectedMethod: 'wechat',
      paymentSuccess: false,
      orderTotal: 0
    }
  },
  methods: {
    selectPaymentMethod(method) {
      this.selectedMethod = method;
    },
    
    async processPayment() {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        this.$router.push('/login');
        return;
      }
      
      if (!confirm('确认要支付这笔订单吗？')) {
        return;
      }
      
      try {
        const response = await fetch(`${this.$apiBase}/api/cart/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: user, 
            totalPrice: this.orderTotal 
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.paymentSuccess = true;
          
          // 3秒后跳转到首页
          setTimeout(() => {
            this.$router.push('/');
          }, 3000);
        } else {
          alert('支付处理失败，请重试');
        }
      } catch (error) {
        console.error('支付失败:', error);
        alert('支付过程中出现错误，请重试');
      }
    }
  },
  
  mounted() {
    // 从URL参数获取订单总额
    const urlParams = new URLSearchParams(window.location.search);
    this.orderTotal = parseFloat(urlParams.get('total') || '0');
  }
}
</script>