<template>
  <div class="legal-page">
    <div class="legal-container">
      <router-link to="/" class="back-link">← 返回首页</router-link>
      <h1>隐私政策</h1>
      <p class="update-date">最后更新日期：2026 年 6 月 26 日</p>
      <p class="effective-date">生效日期：2026 年 6 月 26 日</p>

      <section>
        <h2>1. 引言</h2>
        <p>FlexiKit（以下简称"我们"）深知隐私对您的重要性。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。</p>
        <p>本政策适用于您在使用 FlexiKit 网站及相关服务时的所有个人信息处理活动。</p>
      </section>

      <section>
        <h2>2. 我们收集的信息</h2>
        <p><strong>2.1 您主动提供的信息：</strong></p>
        <ul>
          <li><strong>账户信息：</strong>注册时提供的用户名、邮箱地址、密码（加密存储）</li>
          <li><strong>个人资料：</strong>您选择填写的显示名称、头像</li>
          <li><strong>工具数据：</strong>您创建的自定义工具（名称、URL、描述、图标）</li>
          <li><strong>偏好设置：</strong>主题模式、布局偏好、收藏列表</li>
        </ul>
        <p><strong>2.2 自动收集的信息：</strong></p>
        <ul>
          <li><strong>日志数据：</strong>IP 地址、浏览器类型、访问时间、引用页面</li>
          <li><strong>Cookie：</strong>用于会话管理、偏好记忆、安全防护（详见第 6 条）</li>
          <li><strong>使用数据：</strong>功能使用频率、页面浏览量（匿名统计）</li>
        </ul>
      </section>

      <section>
        <h2>3. 信息的使用</h2>
        <p>我们使用收集的信息用于：</p>
        <ul>
          <li>提供、维护和改进 FlexiKit 服务</li>
          <li>处理注册、登录和账户管理</li>
          <li>提供智能推荐和个性化体验</li>
          <li>向您发送重要的服务通知（如安全更新）</li>
          <li>检测和防止欺诈、滥用和安全事件</li>
          <li>遵守法律义务</li>
        </ul>
        <p>我们<strong>不会</strong>出售您的个人信息。</p>
      </section>

      <section>
        <h2>4. 数据存储与安全</h2>
        <p><strong>4.1 存储位置：</strong>您的数据存储在位于中国大陆的服务器上（遵循 ICP 备案要求），使用 PostgreSQL 数据库进行管理。</p>
        <p><strong>4.2 安全措施：</strong>我们采用业界标准的安全措施保护您的数据，包括：</p>
        <ul>
          <li>密码使用 bcrypt 加密存储，不可逆</li>
          <li>API 使用 JWT 令牌进行身份验证</li>
          <li>HTTPS 加密传输</li>
          <li>服务器访问控制和日志审计</li>
        </ul>
        <p><strong>4.3 数据保留：</strong>我们仅在提供服务所必需的时间内保留您的个人信息。账户删除后，所有关联数据将在 30 天内永久清除。</p>
      </section>

      <section>
        <h2>5. 第三方服务</h2>
        <p>我们<strong>不会</strong>将您的个人信息分享给第三方用于其自身的营销目的。以下情况下可能涉及有限的第三方访问：</p>
        <ul>
          <li><strong>托管服务：</strong>我们的服务器托管商可能接触基础架构层面的数据</li>
          <li><strong>分析服务：</strong>可能使用匿名化的分析工具来改善服务</li>
          <li><strong>法律要求：</strong>在法律要求或许可的情况下向执法机构披露信息</li>
        </ul>
      </section>

      <section>
        <h2>6. Cookie 政策</h2>
        <p>我们使用以下类型的 Cookie：</p>
        <ul>
          <li><strong>必要 Cookie：</strong>用于用户认证（JWT Token 存储）、CSRF 防护，是服务正常运行所必需的</li>
          <li><strong>功能 Cookie：</strong>用于记住您的主题偏好、布局设置、语言选择</li>
          <li><strong>分析 Cookie：</strong>用于匿名统计访问量和使用情况（如使用）</li>
        </ul>
        <p>您可以通过浏览器设置管理 Cookie 偏好，或使用我们的 Cookie 偏好面板（页面底部可随时调出）。禁用必要 Cookie 可能导致部分功能不可用。</p>
      </section>

      <section>
        <h2>7. 您的权利</h2>
        <p>根据适用的数据保护法律（包括 GDPR），您享有以下权利：</p>
        <ul>
          <li><strong>访问权：</strong>请求获取我们持有的您的个人数据副本</li>
          <li><strong>更正权：</strong>更正不准确的个人信息</li>
          <li><strong>删除权（被遗忘权）：</strong>请求删除您的个人数据</li>
          <li><strong>数据可携带权：</strong>以结构化、机器可读的格式导出您的数据</li>
          <li><strong>限制处理权：</strong>限制或反对我们对您数据的处理</li>
        </ul>
        <p>要行使上述权利，请通过"数据管理"页面或联系 support@flexikit.com。我们将在 30 天内回复您的请求。</p>
      </section>

      <section>
        <h2>8. 儿童隐私</h2>
        <p>本服务不面向 13 岁以下的儿童。我们不会故意收集儿童的个人信息。如果您是家长或监护人并发现您的孩子向我们提供了个人信息，请联系我们，我们将及时删除。</p>
      </section>

      <section>
        <h2>9. 跨境数据传输</h2>
        <p>您的数据主要存储在中国大陆境内。如涉及跨境数据传输（如使用国际 CDN 服务），我们将确保数据传输符合适用的数据保护法律。</p>
      </section>

      <section>
        <h2>10. 政策更新</h2>
        <p>我们可能不时更新本隐私政策。重大变更将通过网站公告或邮件通知。继续使用本服务即表示您接受更新后的隐私政策。</p>
      </section>

      <section>
        <h2>11. 联系我们</h2>
        <p>如对本隐私政策有任何疑问或顾虑，请联系：</p>
        <ul>
          <li>邮箱：support@flexikit.com</li>
          <li>GitHub：<a href="https://github.com/baimuxi/flexikit" target="_blank">baimuxi/flexikit</a></li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// 纯静态页面
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
