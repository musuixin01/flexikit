import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'

export interface CurrentFileContext {
  name: string
  extension: string
  content: string
}

type NativeFileSelection = [string, string, string]

const MAX_FILE_CONTENT_LENGTH = 32 * 1024
const SUPPORTED_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'yaml', 'yml', 'toml', 'csv', 'log',
  'xml', 'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'vue', 'py',
  'rs', 'c', 'h', 'cpp', 'hpp', 'cc', 'java', 'kt', 'kts', 'go', 'sql',
  'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
])

function normalizeSelection(selection: NativeFileSelection): CurrentFileContext {
  const [rawName, rawExtension, content] = selection
  const name = rawName.trim()
  const extension = rawExtension.trim().toLowerCase()

  if (!name || name.length > 255 || /[\\/]/.test(name)) {
    throw new Error('所选文件名无效')
  }
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('该文件类型暂不支持作为 AI 上下文')
  }
  const contentBytes = new TextEncoder().encode(content).byteLength
  if (!content.trim() || contentBytes > MAX_FILE_CONTENT_LENGTH) {
    throw new Error('文件内容为空或超过 32 KiB 限制')
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content)) {
    throw new Error('文件包含不支持的控制字符')
  }

  return { name, extension, content }
}

export async function pickCurrentFileContext(): Promise<CurrentFileContext | null> {
  if (!isDesktopRuntime()) {
    throw new Error('文件上下文仅支持 FlexiKit 桌面端')
  }

  const selection = await invokeDesktop<NativeFileSelection | null>(
    'pick_assistant_text_file',
  )
  return selection ? normalizeSelection(selection) : null
}
