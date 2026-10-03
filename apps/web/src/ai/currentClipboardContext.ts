import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'

export interface CurrentClipboardContext {
  content: string
}

const MAX_CLIPBOARD_BYTES = 16 * 1024
const UNSAFE_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

export async function readCurrentClipboardContext(): Promise<CurrentClipboardContext> {
  if (!isDesktopRuntime()) {
    throw new Error('剪贴板上下文仅支持 FlexiKit 桌面端')
  }

  const content = await invokeDesktop<string | null>('get_clipboard_text')
  if (!content?.trim()) {
    throw new Error('当前剪贴板没有可用的文本内容')
  }

  const byteLength = new TextEncoder().encode(content).byteLength
  if (byteLength > MAX_CLIPBOARD_BYTES) {
    throw new Error('剪贴板文本超过 16 KiB 限制')
  }
  if (UNSAFE_CONTROL_PATTERN.test(content)) {
    throw new Error('剪贴板文本包含不支持的控制字符')
  }

  return { content }
}
