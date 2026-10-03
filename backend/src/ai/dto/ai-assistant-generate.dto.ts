import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SAFE_SINGLE_LINE_PATTERN = /^[^\r\n\u0000-\u001f\u007f]+$/;
const SAFE_TEXT_CONTENT_PATTERN = /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/;
export const AI_ASSISTANT_FILE_EXTENSIONS = [
  'txt',
  'md',
  'markdown',
  'json',
  'yaml',
  'yml',
  'toml',
  'csv',
  'log',
  'xml',
  'html',
  'htm',
  'css',
  'js',
  'jsx',
  'ts',
  'tsx',
  'vue',
  'py',
  'rs',
  'c',
  'h',
  'cpp',
  'hpp',
  'cc',
  'java',
  'kt',
  'kts',
  'go',
  'sql',
  'sh',
  'bash',
  'zsh',
  'ps1',
  'bat',
  'cmd',
] as const;

export class AiAssistantToolContextDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @Matches(SAFE_SINGLE_LINE_PATTERN)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(SAFE_SINGLE_LINE_PATTERN)
  category?: string;

  @IsIn(['web', 'local'])
  kind!: 'web' | 'local';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(SAFE_SINGLE_LINE_PATTERN)
  host?: string;
}

export class AiAssistantFileContextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(SAFE_SINGLE_LINE_PATTERN)
  name!: string;

  @IsString()
  @IsIn(AI_ASSISTANT_FILE_EXTENSIONS)
  extension!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32 * 1024)
  @Matches(SAFE_TEXT_CONTENT_PATTERN)
  content!: string;
}

export class AiAssistantClipboardContextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16 * 1024)
  @Matches(SAFE_TEXT_CONTENT_PATTERN)
  content!: string;
}

export class AiAssistantGenerateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16_000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(PROVIDER_ID_PATTERN)
  providerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(SAFE_SINGLE_LINE_PATTERN)
  modelId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32 * 1024)
  @Matches(SAFE_SINGLE_LINE_PATTERN)
  byokApiKey?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiAssistantToolContextDto)
  currentTool?: AiAssistantToolContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiAssistantFileContextDto)
  currentFile?: AiAssistantFileContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiAssistantClipboardContextDto)
  currentClipboard?: AiAssistantClipboardContextDto;
}
