import type { Tool } from '@/types/tool'
import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'
import { recordCurrentToolContext } from '@/ai/currentToolContext'
import { recordToolUsage } from '@/utils/toolUsage'

export async function openDesktopTool(tool: Tool): Promise<boolean> {
  const localPath = tool.localPath || tool.local_path || ''
  if (localPath) {
    if (!isDesktopRuntime()) return false
    await invokeDesktop('open_local_path', { path: localPath })
    recordToolUsage(tool)
    recordCurrentToolContext(tool)
    return true
  }

  if (tool.url && tool.url !== '#') {
    try {
      const url = new URL(tool.url)
      if (!['http:', 'https:'].includes(url.protocol)) return false
      if (isDesktopRuntime()) {
        await invokeDesktop('open_external_url', { url: url.toString() })
        recordToolUsage(tool)
        recordCurrentToolContext(tool)
        return true
      }
      window.open(url.toString(), '_blank', 'noopener,noreferrer')
      recordToolUsage(tool)
      recordCurrentToolContext(tool)
      return true
    } catch {
      return false
    }
  }

  return false
}
