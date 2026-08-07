# Skill: FlexiKit High-Fidelity UI/UX Designer

## Description
当用户要求编写、重构或美化 FlexiKit 前端（`frontend/`）的 Vue 3 组件、视图页面、布局（Layout）或任何涉及 CSS/Tailwind 样式的 UI 元素时强制触发。此技能硬编码了项目的现代化毛玻璃（Glassmorphism）视觉设计规范与响应式交互标准，确保生成的页面具有极高颜值与视觉一致性。

## Strict Triggers
- "帮我写一个前端页面"
- "写个高颜值的组件"
- "重构前端 UI/界面"
- "美化这个 FlexiKit 的卡片/弹窗/导航"

## Core Design Tokens & Rules
大模型在输出 HTML/Tailwind 类名时，必须无条件嵌入以下设计原子：

1. **毛玻璃与背景规范（Glassmorphism Base）：**
   - 核心容器（如工具卡片、侧边栏、弹窗）必须带有模糊和半透明度。
   - 必须使用类名组合：`bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-800/50 shadow-xl`。

2. **现代微渐变（Subtle Gradients）：**
   - 亮色主题背景推荐：`bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50`。
   - 暗色主题背景推荐：`dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950`。

3. **完美响应式与网格（Responsive Grid）：**
   - 工具展示列表必须完美适配多端。必须使用：`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6`。

4. **高级动态交互（Micro-interactions）：**
   - 所有可点击卡片、按钮必须自带丝滑过渡动画。必须包含：`transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl`。

## Component Patterns (标准组件组装规范)
- **工具卡片（Tool Card）：** 必须包含三层结构：顶部（图标与标题、收藏星标）、中部（工具简短描述，限制两行溢出省略 `line-clamp-2`）、底部（AI 智能标签，使用小巧的 `badge` 药丸样式裹挟）。
- **亮暗主题适配：** 任何硬编码的 `text-black` 或 `bg-white` 必须成对出现 `dark:text-white` 和 `dark:bg-slate-900`。

## Negative Constraints (绝对禁止)
- **严禁**使用未经纯化的高饱和度刺眼纯色背景（如纯 `bg-blue-500` 或纯 `bg-red-500`），必须使用渐变或低饱和度调和。
- **严禁**输出不带 `transition` 动画的突兀 Hover 状态。

## Output Template Example
当触发此技能生成一个“工具卡片组件”时，标准结构必须如下：
```vue
<template>
  <div class="group relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-800/50 rounded-2xl p-5 shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-500/30 flex flex-col justify-between h-48">
    <div class="flex items-start justify-between">
      <div class="flex items-center space-x-4">
        <div class="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
          <slot name="icon">🛠️</slot>
        </div>
        <div>
          <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-lg line-clamp-1">{{ title }}</h3>
          <span class="text-xs text-slate-400 dark:text-slate-500">{{ category }}</span>
        </div>
      </div>
      <button class="text-slate-300 hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400 transition-colors">
        ⭐
      </button>
    </div>

    <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 my-3 flex-grow">
      {{ description }}
    </p>

    <div class="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
      <span v-for="tag in tags" :key="tag" class="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        #{{ tag }}
      </span>
    </div>
  </div>
</template>