# ICP 备案与合规指南

> FlexiKit 在中国大陆运营的法律合规操作手册

---

## 一、ICP 备案（必须）

### 1.1 什么是 ICP 备案
根据《互联网信息服务管理办法》，在中华人民共和国境内提供互联网信息服务的网站，必须进行 ICP 备案。

**ICP 备案号格式**：`沪ICP备XXXXXXXX号-X`（各省不同）

### 1.2 备案主体要求
- **个人备案**：需要身份证 + 人脸识别，只能做非经营性网站
- **企业备案**：需要营业执照 + 法人信息，可做经营性网站

### 1.3 备案流程（阿里云示例）
1. 购买域名（如 `flexikit.com`）→ 完成实名认证
2. 购买服务器（中国大陆节点，如阿里云 ECS / 腾讯云 CVM）
3. 登录服务商备案系统 → 填写主体信息
4. 提交网站信息（网站名称、域名、服务内容）
5. 上传证件 + 人脸核验
6. 服务商初审（1-2 个工作日）
7. 管局审核（10-20 个工作日）
8. 获取备案号 → 悬挂在网站底部

### 1.4 备案号悬挂
在网站底部显示备案号，链接至工信部备案查询系统：

```html
<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">
  沪ICP备XXXXXXXX号-X
</a>
```

---

## 二、公安联网备案（推荐）

获得 ICP 备案号后 30 天内，在 [全国公安机关互联网站安全服务平台](https://beian.mps.gov.cn/) 完成公网安备。

格式：`沪公网安备 XXXXXXXXXXXX号`

---

## 三、ICP 许可证（经营性网站）

如果 FlexiKit 涉及以下任一业务，需额外办理 **ICP 许可证**：
- 收费会员 / 订阅服务
- 在线交易（如售卖 Premium 版本）
- 广告收入平台

**个人无法办理 ICP 许可证**，需注册公司。

---

## 四、FlexiKit 上架检查清单

| 项目 | 状态 | 说明 |
|------|------|------|
| ✅ 用户协议 (Terms) | 已完成 | `frontend/src/views/Terms.vue` |
| ✅ 隐私政策 (Privacy) | 已完成 | `frontend/src/views/Privacy.vue` |
| ✅ Cookie 同意横幅 | 已完成 | `frontend/src/components/common/CookieConsent.vue` |
| ✅ GDPR 数据导出 API | 已完成 | `GET /api/users/export-data` |
| ✅ GDPR 账号删除 API | 已完成 | `DELETE /api/users/account` |
| ✅ 数据管理页面 | 已完成 | `frontend/src/views/DataManagement.vue` |
| 🔲 ICP 备案 | 待办 | 需要域名 + 国内服务器 |
| 🔲 工信部备案号悬挂 | 待办 | 备案通过后添加到页脚 |
| 🔲 公安联网备案 | 待办 | ICP 备案后 30 天内 |
| 🔲 HTTPS 证书部署 | 待办 | 使用 Let's Encrypt 或云服务商免费证书 |
| 🔲 ICP 许可证 | 按需 | 仅经营性业务需要 |

---

## 五、GDPR 合规补充项

如果计划向欧盟用户提供服务：

| 要求 | 实现方式 |
|------|----------|
| 数据保护官 (DPO) | 指定邮箱 `dpo@flexikit.com` |
| 数据处理记录 (ROPA) | 在隐私政策中列出所有数据处理活动 |
| 数据泄露通知 | 72 小时内通知监管机构和用户 |
| 用户权利响应 | 30 天内处理数据访问/删除请求 |
| 年龄验证 | 如涉及 13-16 岁用户，需家长同意机制 |

---

## 六、快速开始步骤

```bash
# 1. 注册域名（推荐阿里云万网 / Cloudflare）
# 2. 备案通过后配置 DNS 解析到服务器 IP
# 3. 部署 HTTPS（Let's Encrypt）
# 4. 添加备案号到 Landing.vue 页脚
# 5. 前端构建 + 部署
cd frontend
npm run build
```

---

> 📝 **建议**：先用 `localhost` + 假域名跑通所有功能，等 ICP 备案通过后再切换到正式域名上线。
