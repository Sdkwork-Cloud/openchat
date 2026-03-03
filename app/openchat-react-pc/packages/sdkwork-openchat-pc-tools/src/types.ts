import type { BaseEntity } from '@sdkwork/openchat-pc-contracts';

export type ToolCategory = 'utility' | 'converter' | 'generator' | 'developer' | 'ai';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ToolCategory;
  isPopular?: boolean;
  isNew?: boolean;
}

export interface ToolHistory extends BaseEntity {
  toolId: string;
  toolName: string;
  input?: string;
  output?: string;
}

export interface QRCodeData {
  content: string;
  size?: number;
  color?: string;
  bgColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

export interface ToolExecutionOptions {
  mode?: "encode" | "decode" | "toDate" | "toTimestamp" | "escape" | "unescape" | "auto";
  caseMode?: "upper" | "lower" | "title" | "camel";
  password?: PasswordOptions;
  paragraphs?: number;
  hashAlgorithm?: "md5" | "sha1" | "sha256";
}

export interface ToolExecutionResult {
  output: string;
  notice?: string;
}

export interface ConverterData {
  type: 'json' | 'base64' | 'url' | 'timestamp';
  input: string;
  output: string;
}


