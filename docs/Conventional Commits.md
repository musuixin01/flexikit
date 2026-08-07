## Git & 版本控制规范

当你协助我进行代码提交（git commit）时，必须严格遵守 **Conventional Commits（约定式提交）** 规范：

1. **格式**：`<type>(<scope>): <subject>`
2. **Type 类型限制**：
   - `feat`: 新功能 (Feature)
   - `fix`: 修复 Bug
   - `docs`: 文档修改
   - `style`: 代码格式修改（不影响逻辑）
   - `refactor`: 重构（既不是新增功能也不是修复 Bug）
   - `perf`: 性能优化
   - `test`: 增加测试
   - `chore`: 构建过程或辅助工具的变动
3. **要求**：
   - 提交前必须先运行 `git diff` 检查具体改动。
   - 标题简明扼要，不超过 50 个字符。
   - 如果改动复杂，在正文中列出具体的修改点（Bullet points）。