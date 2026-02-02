<template>
  <div class="login-container" style="background: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(139, 76, 48, 0.08); border: none; padding: 40px; width: 100%; max-width: 400px; margin: 40px auto; display: flex; flex-direction: column;">
    <div class="logo" style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 28px; font-weight: 400; color: #8b4c30; margin-bottom: 8px; font-family: 'Georgia', serif;">🏛️ 冀遗筑梦</h1>
      <p style="color: #a89f96; font-size: 16px;">登录您的账户</p>
    </div>
    
    <div v-if="errorMessage" class="alert" style="padding: 12px; background: #fef2f2; border: 1px solid #d9d2ca; border-radius: 6px; color: #dc2626; margin-bottom: 20px;">
      {{ errorMessage }}
    </div>
    
    <form @submit.prevent="handleLogin" style="width: 100%;">
      <div class="form-group" style="margin-bottom: 20px;">
        <label for="username" style="display: block; margin-bottom: 8px; color: #5a5651; font-size: 14px;">用户名</label>
        <input type="text" id="username" v-model="username" class="form-control" placeholder="请输入用户名" required style="width: 100%; padding: 14px; border: 1px solid #d9d2ca; border-radius: 6px; font-size: 16px; background: #faf8f5; color: #5a5651; transition: all 0.3s;" />
      </div>
      
      <div class="form-group" style="margin-bottom: 20px;">
        <label for="password" style="display: block; margin-bottom: 8px; color: #5a5651; font-size: 14px;">密码</label>
        <input type="password" id="password" v-model="password" class="form-control" placeholder="请输入密码" required style="width: 100%; padding: 14px; border: 1px solid #d9d2ca; border-radius: 6px; font-size: 16px; background: #faf8f5; color: #5a5651; transition: all 0.3s;" />
      </div>
      
      <button type="submit" class="btn-login" style="width: 100%; padding: 14px; background: transparent; color: #8b4c30; border: 1px solid #d9d2ca; border-radius: 6px; font-size: 16px; font-weight: 400; cursor: pointer; transition: all 0.3s;">登录</button>
    </form>
    
    <div class="links" style="text-align: center; margin-top: 20px; font-size: 14px;">
      <router-link to="/" style="color: #8b4c30; text-decoration: none; margin: 0 10px;">返回首页</router-link>
      <router-link to="/register" style="color: #8b4c30; text-decoration: none; margin: 0 10px;">注册账户</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginView',
  data() {
    return {
      username: '',
      password: '',
      errorMessage: ''
    }
  },
  methods: {
    async handleLogin() {
      try {
        const response = await fetch(`${this.$apiBase}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: this.username, password: this.password })
        });
        
        const data = await response.json();
        
        if(data.success) {
          localStorage.setItem('currentUser', this.username);
          this.$router.push('/');
        } else {
          this.errorMessage = data.message || '登录失败，请检查用户名和密码';
        }
      } catch(error) {
        this.errorMessage = '网络错误，请稍后重试';
      }
    }
  }
}
</script>