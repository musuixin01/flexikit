# FlexiKit 商业化与收费策略

## 1. 当前决策

FlexiKit 计划收费，但当前阶段不立即正式收费。

现阶段优先完成稳定性、安装与更新、桌面交互、数据安全、账号和授权基础设施，并积累真实用户反馈。商业化应建立在“用户已经愿意长期使用 FlexiKit”的基础上，而不是通过人为限制核心体验逼迫付费。

建议发布节奏：

- v0.1 ～ v0.5：公开测试阶段，核心功能免费，优先验证稳定性和产品价值
- v0.8：引入账号、授权、Pro 权益和商业化基础设施，可开始小规模付费测试
- v1.0：达到稳定发布门槛后正式商业化
- 早期用户可提供 Founder / Early Adopter 永久本地 Pro 权益，但不包含持续产生成本的 AI 和云服务

## 2. 收费原则

### 2.1 核心桌面体验永久免费

以下能力不应该通过“数量限制”制造付费障碍：

- Desktop Canvas
- 桌宠
- Launcher / Launchpad
- 基础搜索
- 本地工具管理与启动
- 基础 Widget
- Widget 自由添加
- Widget 自由尺寸和布局
- Todo
- 基础 Music Widget / 歌词
- 基础主题与桌面交互

明确不采用：

- “最多只能放 5 个 Widget”
- “免费版只能启动 10 个应用”
- “桌宠必须 Pro 才能使用”
- “Canvas 尺寸 / 布局自由度按会员限制”

FlexiKit 的免费版本必须本身就是完整、可长期使用的产品。

### 2.2 Pro 收费的是持续价值，而不是解除人为限制

Pro 应围绕以下方向：

- 高级主题、动态主题和高级视觉效果
- 高级布局模板与工作区模板
- 高级 Clipboard 历史、分类和搜索
- 自动化规则与快捷工作流
- 智能应用 / 文件分类
- 高级系统监控 Widget
- 专业效率 Widget
- 配置备份与跨设备同步
- 高级搜索与工作区能力
- 可选的高级自定义能力

### 2.3 AI 与本地 Pro 分离

AI 会持续产生模型调用成本，因此不能简单承诺“永久无限 AI”。

FlexiKit 应区分：

1. 本地 Pro 权益
2. 云服务 / 同步权益
3. AI 使用额度

AI 支持两种模式：

- FlexiKit AI Credits：FlexiKit 统一提供模型能力并按额度管理成本
- BYOK（Bring Your Own Key）：高级用户可使用自己的 API Key

BYOK 不应替代 FlexiKit 的商业模式，而应作为高级用户的可选能力。

## 3. 初步版本规划

> 以下价格为产品实验区间，不是最终定价。正式收费前需要根据真实用户留存、使用频率、AI 成本和市场反馈重新校准。

| 版本 | 定位 | 初步价格建议 |
| --- | --- | --- |
| Free | 完整基础桌面效率体验 | 免费 |
| Pro | 高级效率、主题、自动化、同步等 | ¥99 ～ ¥199 / 年 |
| AI Pro | Pro + 原生 AI 助手和 AI 工作流 | ¥199 ～ ¥299 / 年起 |
| AI Credits | 超出套餐或高成本模型使用 | 按额度购买 |
| Founder Pro | 早期用户的本地 Pro 永久权益 | 可测试 ¥99 / ¥129 一次性 |

Founder Pro 只覆盖本地软件能力。以下持续成本能力不能承诺永久无限：

- AI Token
- 云存储
- 跨设备同步服务器
- 第三方付费服务
- 企业协作服务

## 4. Free / Pro / AI Pro 边界

### Free

目标：用户不付费也愿意长期使用。

建议包括：

- Desktop Canvas
- Pet
- Launcher / Launchpad
- Tool 管理
- 本地应用启动
- 基础搜索
- Todo
- Clipboard 当前内容按需访问
- Music / Lyrics
- Clock / Disk 等基础 Widget
- Widget 自由布局
- 基础主题
- 本地数据

### Pro

目标：为高频用户节省更多时间。

建议包括：

- 高级主题和视觉自定义
- 工作区 / 布局模板
- 高级 Clipboard History
- 自动化规则
- 智能分类
- 高级 Widget
- 高级搜索
- 配置同步
- 多设备布局同步
- 高级备份 / 恢复
- 更多专业工作流能力

### AI Pro

目标：让 FlexiKit 从“桌面工具层”升级为“桌面智能工作空间”。

建议包括：

- 原生 AI Widget
- 桌宠 AI
- Context-aware Assistant
- 当前应用上下文
- 文件 / 文档上下文
- 屏幕内容理解
- AI 自动化
- 自然语言启动工作流
- Model Router
- 语音交互
- AI 个性化工作区

AI Pro 的模型访问应受 Credits / Fair Use / BYOK 策略控制。

## 5. 商业化技术架构

正式收费前需要建立独立的 Entitlement 层，业务组件不能直接写死：

```text
if (user.isPro) { ... }
```

建议：

```text
Account
   ↓
Subscription / License
   ↓
Entitlement Service
   ↓
Feature Flags
   ↓
Desktop / Web / AI
```

至少需要支持：

- Free / Pro / AI Pro 权益判断
- 年付 / 月付
- Founder 永久本地权益
- AI Credits
- BYOK 权限
- 恢复购买
- 订阅到期
- 退款 / 撤销授权
- 合理的离线宽限期
- 设备管理
- 服务端权威权益校验
- Desktop 本地缓存权益，网络恢复后重新校验

权限定义应使用能力键，例如：

```text
desktop.canvas
desktop.pet
pro.theme.advanced
pro.automation
pro.sync
ai.assistant
ai.context
ai.credits
```

不要把套餐名直接散落在业务代码中。

## 6. AI 成本控制

AI 商业化前必须先完成：

- Provider 成本统计
- 每用户 Token / Credits 消耗统计
- 每模型成本统计
- Model Router
- 免费额度
- Pro / AI Pro 月度额度
- 超额处理
- BYOK（S5.1 技术安全底座已完成；套餐/Entitlement 权限门控仍留在后续商业化阶段）
- 请求限流
- 异常成本保护
- 高成本 Agent 工作流单独计费策略

AI 不应在没有成本观测的情况下上线“无限使用”。

## 7. 正式收费前的发布门槛

以下条件没有完成前，不进入正式 v1.0 收费。

### Desktop

- 安装包完整验证
- 自动更新机制
- Explorer / WorkerW 稳定性回归
- 多显示器 / DPI
- Canvas 核心交互回归
- 数据迁移与恢复
- 崩溃恢复

### Account

- 注册 / 登录稳定
- Token 生命周期
- 安全的本地凭据策略
- 设备管理
- 账号注销
- 密码重置
- 数据导出

### Billing

- Subscription / License 数据模型
- Entitlement Service
- 服务端订单校验
- 恢复购买
- 到期 / 退款 / 撤销
- 发票 / 收据策略
- 离线宽限

### AI

- 统一 AI Provider
- Model Router
- 成本统计
- Credits
- BYOK
- 隐私策略
- AI 数据留存策略

### Product

- 崩溃率达到可接受水平
- 核心功能有稳定真实用户
- 有留存数据证明产品被持续使用
- Free → Pro 的价值差异来自真实高级能力，而不是人为降级 Free

## 8. 早期用户策略

早期测试阶段建议：

- 核心产品免费
- 不急于限制功能
- 重点收集真实使用行为与反馈
- 对早期高参与用户保留 Founder 权益
- v0.8 商业化测试时给早期用户优惠
- v1.0 后仍保留合理的 Free 版本

如果推出 Founder Pro：

- 只承诺本地 Pro 功能永久使用
- 不承诺永久无限 AI
- 不承诺永久无限云存储
- 明确后续云服务 / AI 服务可能单独收费

## 9. 产品价值主线

FlexiKit 不应把自己定位成“卖 Widget 的软件”。

真正的长期商业价值是：

```text
Desktop Canvas
+ Launcher
+ Pet
+ Search
+ Application / File Management
+ AI
+ Automation
+ Sync
= Windows 智能桌面工作空间
```

用户付费的核心理由应该是：

> FlexiKit 持续减少我找应用、找文件、切换工具、重复操作和处理信息所花的时间。

而不是：

> 不付费就不能正常使用桌面组件。

## 10. 当前结论

- 商业化方向：确定
- 当前正式收费：暂缓
- Free 核心体验：长期保留
- Pro：高级效率能力
- AI Pro：原生 AI 与智能工作流
- AI 成本：Credits / Fair Use / BYOK
- Founder：可做一次性本地 Pro 早期实验
- v1.0 收费前：必须先完成稳定性、授权、支付、更新和 AI 成本治理
