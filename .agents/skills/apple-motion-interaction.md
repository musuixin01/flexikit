# Skill: Apple-Motion-Interaction (High-End UX)

## Motion Design Principles
1. **Natural Easing**: 
   - 必须使用 Apple 标准曲线: `cubic-bezier(0.25, 0.1, 0.25, 1.0)`。
   - 禁止在任何交互中使用 `linear` 或默认 `ease`。
2. **Micro-Interactions**: 
   - 悬停 (Hover): `hover:scale-[1.02] hover:shadow-lg`
   - 点击 (Active): `active:scale-[0.98]` (模拟真实挤压感)。
   - 持续时间: 统一设为 `duration-300`。
3. **Transition Rules**: 
   - 所有交互必须在 `100ms` 内提供视觉反馈。
   - 内容显隐切换必须包含 `opacity-0` 到 `opacity-100` 的渐变。
   - 列表元素进入建议添加 `transition-all translate-y-0` 的入场动画。

## Interaction Logic
- **Pointer Feedback**: 尽可能在卡片 hover 时，配合背景亮度微调 (brightness-105)。
- **Selection**: 选中状态下应有明显的 `ring-2 ring-indigo-500/50` 视觉提示。