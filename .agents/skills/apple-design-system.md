# Skill: Apple-Design-System (High-Fidelity)

## Trigger
UI, CSS, 配色, 布局, 样式, 设计, 组件, Apple, 毛玻璃, 交互, Tailwind

## System Constraint
- 在处理任何 UI 任务时，必须优先加载本规范。
- 禁止使用普通的 Tailwind 默认阴影（如 shadow-md），必须使用下方定义的精密阴影。
- 若出现冲突，本文件定义的 CSS 变量优先级高于全局 Tailwind 配置。

## Aesthetic Core Principles
1. **Glassmorphism 2.0**:
   - 基础层: `bg-white/70 backdrop-blur-2xl backdrop-saturate-150` (亮色模式)
   - 基础层: `bg-slate-900/70 backdrop-blur-2xl backdrop-saturate-150` (暗色模式)
2. **Typography**:
   - 字体: `font-sans antialiased tracking-[-0.01em]`
   - 行高: 始终使用 `leading-relaxed` 或更高，确保字间距舒适。
3. **Rounded Geometry**:
   - 组件圆角: `rounded-[20px]` (模拟 Squircle 平滑过渡)。
4. **Subtle Shadows & Borders**:
   - 边框: `border border-white/20` (亮) / `border-white/10` (暗)
   - 阴影: `shadow-[0_8px_30px_rgb(0,0,0,0.06)]`
   - 内环: 必须包含 `ring-1 ring-inset ring-white/10` 以增加深邃感。

## Tailwind Configuration (Strict)
- bg-card: `bg-white/70 dark:bg-slate-900/70`
- blur: `backdrop-blur-2xl`
- transition-preset: `transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]`

## Fallback Policy
- 若当前组件无法满足上述玻璃态效果（如纯文字区域），Fallback 使用 Tailwind `indigo-500` 作为语义色。
- 在涉及主题管理时，始终优先调用 `applyCssVariables()`，强制赋予 `--primary: #0071e3` (Apple Blue)。