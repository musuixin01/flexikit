<template>
  <div class="legal-page">
    <div class="legal-container">
      <router-link to="/" class="back-link">← 返回首页</router-link>
      <h1>用户协议</h1>
      <p class="update-date">最后更新日期：2026 年 6 月 26 日</p>
      <p class="effective-date">生效日期：2026 年 6 月 26 日</p>

      <section>
        <h2>1. 协议接受</h2>
        <p>欢迎使用 FlexiKit（以下简称"本服务"）。本用户协议（以下简称"协议"）是您（以下简称"用户"）与 FlexiKit 开发团队（以下简称"我们"）之间关于使用本服务所订立的协议。</p>
        <p>通过访问或使用本服务，即表示您同意受本协议约束。如果您不同意本协议的任何条款，请停止使用本服务。</p>
      </section>

      <section>
        <h2>2. 服务说明</h2>
        <p>FlexiKit 是一个通用工具箱平台，提供以下功能：</p>
        <ul>
          <li>自定义工具管理（网页链接、本地应用）</li>
          <li>工具收藏、分类、排序</li>
          <li>智能推荐与工具发现</li>
          <li>多主题与布局自定义</li>
        </ul>
        <p>我们保留随时修改、暂停或终止本服务的权利，恕不另行通知。</p>
      </section>

      <section>
        <h2>3. 用户账户</h2>
        <p><strong>3.1 注册：</strong>您需要注册账户才能使用本服务的完整功能。注册时需提供准确的用户名和邮箱地址。</p>
        <p><strong>3.2 账户安全：</strong>您有责任维护账户和密码的机密性，并对账户下的所有活动负责。</p>
        <p><strong>3.3 账户注销：</strong>您可以随时在"数据管理"页面申请注销账户，我们将删除您的所有关联数据。</p>
      </section>

      <section>
        <h2>4. 可接受使用</h2>
        <p>您同意不会：</p>
        <ul>
          <li>上传或传播任何违法、侵权、有害、骚扰性内容</li>
          <li>干扰或破坏本服务的正常运行</li>
          <li>未经授权访问其他用户的账户或数据</li>
          <li>利用本服务进行任何欺诈或违法活动</li>
          <li>反向工程、反编译或以其他方式试图获取本服务的源代码</li>
        </ul>
      </section>

      <section>
        <h2>5. 知识产权</h2>
        <p>本服务的所有内容（包括但不限于代码、设计、Logo、文本、图形）均受版权法和其他知识产权法保护。未经明确授权，不得复制、修改或分发本服务的任何部分。</p>
        <p>用户创建的自定义工具内容（名称、描述、图标等）归用户所有，但用户授予我们在提供服务所必需的范围内使用该内容的权利。</p>
      </section>

      <section>
        <h2>6. 免责声明与责任限制</h2>
        <p><strong>6.1 服务"按现状"提供：</strong>本服务按"现状"和"可提供"的基础提供，不作任何明示或暗示的保证。</p>
        <p><strong>6.2 第三方内容：</strong>本服务可能包含指向第三方网站的链接，我们对第三方内容不承担任何责任。</p>
        <p><strong>6.3 责任限制：</strong>在法律允许的最大范围内，我们不对因使用本服务而产生的任何间接、偶然、特殊或结果性损害承担责任。</p>
      </section>

      <section>
        <h2>7. 终止</h2>
        <p>我们保留因违反本协议或其他原因随时终止或暂停您账户的权利，恕不另行通知。终止后，您使用本服务的权利立即终止。</p>
        <p>您可以随时通过删除账户终止本协议。</p>
      </section>

      <section>
        <h2>8. 协议修改</h2>
        <p>我们可能不时修订本协议。修订后的版本将在本页面发布，重大变更将通过网站公告或邮件通知。继续使用本服务即表示您接受修订后的协议。</p>
      </section>

      <section>
        <h2>9. 联系我们</h2>
        <p>如对本协议有任何疑问，请联系我们：</p>
        <ul>
          <li>邮箱：support@flexikit.com</li>
          <li>GitHub：<a href="https://github.com/baimuxi/flexikit" target="_blank">baimuxi/flexikit</a></li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// 纯静态页面，无需额外逻辑
</script>

<style scoped>
.legal-page {
  min-height: 100vh;
  background: var(--body-bg);
  padding: 60px 20px 80px;
}

.legal-container {
  max-width: 800px;
  margin: 0 auto;
}

.back-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  display: inline-block;
  margin-bottom: 30px;
  transition: opacity 0.2s;
}
.back-link:hover { opacity: 0.7; }

h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.update-date,
.effective-date {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  margin-bottom: 4px;
}

section {
  margin-top: 36px;
}

section h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 14px;
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--divider);
}

section p {
  font-size: 0.95rem;
  line-height: 1.8;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

section ul {
  margin: 8px 0 16px 20px;
}

section li {
  font-size: 0.95rem;
  line-height: 1.8;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

a {
  color: var(--accent);
  text-decoration: none;
}
a:hover { text-decoration: underline; }

@media (max-width: 640px) {
  .legal-page { padding: 30px 16px 60px; }
  h1 { font-size: 1.6rem; }
  section h2 { font-size: 1.1rem; }
}
</style>
