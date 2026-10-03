export interface AssistantQuickAction {
  id: 'summarize-context' | 'troubleshoot-context' | 'plan-task' | 'rewrite-clearly'
  label: string
  prompt: string
  requiresContext: boolean
}

export const ASSISTANT_QUICK_ACTIONS = Object.freeze<readonly AssistantQuickAction[]>([
  {
    id: 'summarize-context',
    label: '总结上下文',
    prompt: '请总结我已附加的上下文，先给出 3–5 个关键要点，再说明最重要的结论。',
    requiresContext: true,
  },
  {
    id: 'troubleshoot-context',
    label: '排查问题',
    prompt: '请根据我已附加的上下文排查可能的问题：先列出最可能原因，再给出从低风险到高风险的验证步骤。',
    requiresContext: true,
  },
  {
    id: 'plan-task',
    label: '拆解任务',
    prompt: '请把下面目标拆成清晰、可执行的步骤，并说明每一步的完成标准：',
    requiresContext: false,
  },
  {
    id: 'rewrite-clearly',
    label: '优化表达',
    prompt: '请把下面内容改写得更清晰、简洁、专业，同时保留原意：',
    requiresContext: false,
  },
])
