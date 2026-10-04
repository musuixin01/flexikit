# FlexiKit Browser Extension MVP

功能：
- 在网页右上角注入 FlexiKit 悬浮入口
- 获取当前网页标题、URL、favicon、描述
- 用户确认后通过 FlexiKit Tool API 添加当前网站
- 提供本地连接设置与访问令牌配置；访问令牌仅保存在浏览器本机 storage.local，不使用账号同步

构建：npm run build

构建产物位于 dist/，浏览器测试 Profile 与构建目录均不进入 Git。
