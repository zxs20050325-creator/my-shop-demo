<template>
  <div class="register-container" style="background: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(139, 76, 48, 0.08); border: none; padding: 40px; width: 100%; max-width: 400px; margin: 40px auto; display: flex; flex-direction: column;">
    <div class="logo" style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 28px; font-weight: 400; color: #8b4c30; margin-bottom: 8px; font-family: 'Georgia', serif;">🏛️ 冀遗筑梦</h1>
      <p style="color: #a89f96; font-size: 16px;">创建新账户</p>
    </div>
    
    <div v-if="errorMessage" class="alert" style="padding: 12px; background: #fef2f2; border: 1px solid #d9d2ca; border-radius: 6px; color: #dc2626; margin-bottom: 20px;">
      {{ errorMessage }}
    </div>
    
    <form @submit.prevent="handleRegister" style="width: 100%;">
      <div class="form-group" style="margin-bottom: 20px;">
        <label for="reg-username" style="display: block; margin-bottom: 8px; color: #5a5651; font-size: 14px;">用户名</label>
        <input type="text" id="reg-username" v-model="username" class="form-control" placeholder="请输入用户名" required style="width: 100%; padding: 14px; border: 1px solid #d9d2ca; border-radius: 6px; font-size: 16px; background: #faf8f5; color: #5a5651; transition: all 0.3s;" />
      </div>
      
      <div class="form-group" style="margin-bottom: 20px;">
        <label for="reg-password" style="display: block; margin-bottom: 8px; color: #5a5651; font-size: 14px;">密码</label>
        <input type="password" id="reg-password" v-model="password" class="form-control" placeholder="请输入密码" required style="width: 100%; padding: 14px; border: 1px solid #d9d2ca; border-radius: 6px; font-size: 16px; background: #faf8f5; color: #5a5651; transition: all 0.3s;" />
      </div>
      
      <div class="form-group" style="margin-bottom: 20px;">
        <label for="reg-confirm-password" style="display: block; margin-bottom: 8px; color: #5a5651; font-size: 14px;">确认密码</label>
        <input type="password" id="reg-confirm-password" v-model="confirmPassword" class="form-control" placeholder="请再次输入密码" required style="width: 100%; padding: 14px; border: 1px solid #d9d2ca; border-radius: 6px; font-size: 16px; background: #faf8f5; color: #5a5651; transition: all 0.3s;" />
      </div>
      
      <button type="submit" class="btn-register" style="width: 100%; padding: 14px; background: transparent; color: #8b4c30; border: 1px solid #d9d2ca; border-radius: 6px; font-size: 16px; font-weight: 400; cursor: pointer; transition: all 0.3s;">注册</button>
    </form>
    
    <div class="links" style="text-align: center; margin-top: 20px; font-size: 14px;">
      <router-link to="/" style="color: #8b4c30; text-decoration: none; margin: 0 10px;">返回首页</router-link>
      <router-link to="/login" style="color: #8b4c30; text-decoration: none; margin: 0 10px;">已有账户？立即登录</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RegisterView',
  data() {
    return {
      username: '',
      password: '',
      confirmPassword: '',
      errorMessage: ''
    }
  },
  methods: {
    async handleRegister() {
      if(this.password !== this.confirmPassword) {
        this.errorMessage = '两次输入的密码不一致';
        return;
      }
      
      try {
        const response = await fetch(`${this.$apiBase}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: this.username, password: this.password })
        });
        
        const data = await response.json();
        
        if(data.success) {
          this.errorMessage = '注册成功！正在跳转到登录页面...';
          this.errorMessageBg = '#ecfdf5';
          this.errorMessageColor = '#047857';
          
          setTimeout(() => {
            this.$router.push('/login');
          }, 1500);
        } else {
          this.errorMessage = data.message || '注册失败，请稍后重试';
          this.errorMessageBg = '#fef2f2';
          this.errorMessageColor = '#dc2626';
        }
      } catch(error) {
        this.errorMessage = '网络错误，请稍后重试';
        this.errorMessageBg = '#fef2f2';
        this.errorMessageColor = '#dc2626';
      }
    }
  }
}
</script>