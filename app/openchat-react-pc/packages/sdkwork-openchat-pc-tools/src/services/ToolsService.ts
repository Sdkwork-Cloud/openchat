import type {
  PasswordOptions,
  Tool,
  ToolCategory,
  ToolExecutionOptions,
  ToolExecutionResult,
  ToolHistory,
} from "../types";
import { getSDKAdapter } from "./sdk-adapter";

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const TOOL_HISTORY_STORAGE_KEY = "openchat.tools.history";
const FAVORITE_TOOLS_STORAGE_KEY = "openchat.tools.favorites";
const RECENT_TOOLS_STORAGE_KEY = "openchat.tools.recent";
const MAX_HISTORY_ITEMS = 80;
const MAX_RECENT_TOOL_COUNT = 24;
const memoryStore = new Map<string, unknown>();

const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
};

const BUILTIN_TOOLS: Tool[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Validate and pretty-print JSON payloads.",
    icon: "json",
    category: "converter",
    isPopular: true,
  },
  {
    id: "uuid",
    name: "UUID Generator",
    description: "Generate RFC4122 style UUIDs instantly.",
    icon: "uuid",
    category: "utility",
    isPopular: true,
  },
  {
    id: "timestamp",
    name: "Timestamp Converter",
    description: "Convert between unix timestamps and date strings.",
    icon: "time",
    category: "converter",
  },
  {
    id: "base64",
    name: "Base64 Encode/Decode",
    description: "Encode or decode Base64 strings.",
    icon: "base64",
    category: "converter",
    isPopular: true,
  },
  {
    id: "url-encode",
    name: "URL Encode/Decode",
    description: "Encode or decode URI components safely.",
    icon: "url",
    category: "converter",
  },
  {
    id: "html-escape",
    name: "HTML Escape/Unescape",
    description: "Escape or unescape HTML entities.",
    icon: "html",
    category: "developer",
  },
  {
    id: "case-converter",
    name: "Case Converter",
    description: "Convert text to upper/lower/title/camel formats.",
    icon: "case",
    category: "utility",
  },
  {
    id: "password",
    name: "Password Generator",
    description: "Generate random passwords with custom options.",
    icon: "password",
    category: "utility",
    isPopular: true,
  },
  {
    id: "hash",
    name: "Hash Calculator",
    description: "Generate deterministic md5/sha1/sha256 style hashes.",
    icon: "hash",
    category: "developer",
  },
  {
    id: "text-generator",
    name: "Text Generator",
    description: "Generate placeholder text with paragraph control.",
    icon: "text",
    category: "generator",
  },
  {
    id: "qr-code",
    name: "QR Content Builder",
    description: "Generate QR payload text for external scanners.",
    icon: "qr",
    category: "generator",
    isNew: true,
  },
  {
    id: "text-summarize",
    name: "Text Summarizer",
    description: "Create quick summaries from long paragraphs.",
    icon: "summary",
    category: "ai",
    isNew: true,
  },
  {
    id: "code-explain",
    name: "Code Explainer",
    description: "Produce short explanations for source snippets.",
    icon: "code",
    category: "ai",
    isNew: true,
  },
];

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readJson<T>(key: string): T | null {
  if (hasLocalStorage()) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        memoryStore.set(key, cloneSerializable(parsed));
        return parsed;
      }
    } catch {
      // Fall back to memory store.
    }
  }

  if (!memoryStore.has(key)) {
    return null;
  }
  return cloneSerializable(memoryStore.get(key) as T);
}

function writeJson(key: string, value: unknown): void {
  memoryStore.set(key, cloneSerializable(value));
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Keep in-memory fallback only.
    }
  }
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

function loadFavoriteToolIds(): string[] {
  const stored = readJson<string[]>(FAVORITE_TOOLS_STORAGE_KEY);
  if (!stored || !Array.isArray(stored)) {
    return [];
  }
  return unique(stored.filter((item) => typeof item === "string" && item.length > 0));
}

function saveFavoriteToolIds(ids: string[]): void {
  writeJson(FAVORITE_TOOLS_STORAGE_KEY, unique(ids));
}

function loadRecentToolIds(): string[] {
  const stored = readJson<string[]>(RECENT_TOOLS_STORAGE_KEY);
  if (!stored || !Array.isArray(stored)) {
    return [];
  }
  return unique(stored.filter((item) => typeof item === "string" && item.length > 0)).slice(
    0,
    MAX_RECENT_TOOL_COUNT,
  );
}

function saveRecentToolIds(ids: string[]): void {
  writeJson(RECENT_TOOLS_STORAGE_KEY, unique(ids).slice(0, MAX_RECENT_TOOL_COUNT));
}

function normalizeToolHistory(item: Partial<ToolHistory>): ToolHistory | null {
  if (!item.id || !item.toolId || !item.toolName) {
    return null;
  }
  return {
    id: item.id,
    toolId: item.toolId,
    toolName: item.toolName,
    input: item.input,
    output: item.output,
    createTime: typeof item.createTime === "number" ? item.createTime : Date.now(),
    updateTime: typeof item.updateTime === "number" ? item.updateTime : Date.now(),
  };
}

function loadHistory(): ToolHistory[] {
  const stored = readJson<Partial<ToolHistory>[]>(TOOL_HISTORY_STORAGE_KEY);
  if (!stored || !Array.isArray(stored)) {
    return [];
  }
  return stored
    .map((item) => normalizeToolHistory(item))
    .filter((item): item is ToolHistory => item !== null)
    .sort((left, right) => (right.createTime || 0) - (left.createTime || 0));
}

function saveHistory(history: ToolHistory[]): void {
  writeJson(
    TOOL_HISTORY_STORAGE_KEY,
    history
      .slice(0, MAX_HISTORY_ITEMS)
      .map((item) => ({
        ...item,
      })),
  );
}

function ok<T>(data: T, message?: string): ServiceResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

function fail<T>(message: string): ServiceResponse<T> {
  return {
    success: false,
    error: message,
    message,
  };
}

function hasSdkReservation(): boolean {
  const adapter = getSDKAdapter();
  return Boolean(adapter && adapter.isAvailable());
}

function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function normalizePasswordOptions(options?: PasswordOptions): PasswordOptions {
  return {
    length: Math.max(8, Math.min(64, options?.length || DEFAULT_PASSWORD_OPTIONS.length)),
    includeUppercase:
      options?.includeUppercase !== undefined
        ? options.includeUppercase
        : DEFAULT_PASSWORD_OPTIONS.includeUppercase,
    includeLowercase:
      options?.includeLowercase !== undefined
        ? options.includeLowercase
        : DEFAULT_PASSWORD_OPTIONS.includeLowercase,
    includeNumbers:
      options?.includeNumbers !== undefined
        ? options.includeNumbers
        : DEFAULT_PASSWORD_OPTIONS.includeNumbers,
    includeSymbols:
      options?.includeSymbols !== undefined
        ? options.includeSymbols
        : DEFAULT_PASSWORD_OPTIONS.includeSymbols,
  };
}

function generatePassword(options?: PasswordOptions): string {
  const normalized = normalizePasswordOptions(options);
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let candidateChars = "";
  if (normalized.includeUppercase) {
    candidateChars += uppercase;
  }
  if (normalized.includeLowercase) {
    candidateChars += lowercase;
  }
  if (normalized.includeNumbers) {
    candidateChars += numbers;
  }
  if (normalized.includeSymbols) {
    candidateChars += symbols;
  }
  if (!candidateChars) {
    return "";
  }

  let password = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const cursor = Math.floor(Math.random() * candidateChars.length);
    password += candidateChars.charAt(cursor);
  }
  return password;
}

function safeBase64Encode(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    return "";
  }
}

function safeBase64Decode(base64: string): string {
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    return "";
  }
}

function convertCase(text: string, mode: "upper" | "lower" | "title" | "camel"): string {
  if (mode === "upper") {
    return text.toUpperCase();
  }
  if (mode === "lower") {
    return text.toLowerCase();
  }
  if (mode === "title") {
    return text
      .split(/\s+/)
      .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}` : ""))
      .join(" ");
  }

  const words = text
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter((item) => item.length > 0);
  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join("");
}

function parseTimestampToDateString(raw: string): string | null {
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const timestampMs = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString();
}

function parseDateToTimestamp(raw: string): number | null {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return Math.floor(date.getTime() / 1000);
}

function generateLoremIpsum(paragraphs = 2): string {
  const words = [
    "lorem",
    "ipsum",
    "dolor",
    "sit",
    "amet",
    "consectetur",
    "adipiscing",
    "elit",
    "integer",
    "viverra",
    "nibh",
    "fermentum",
    "sollicitudin",
    "facilisis",
    "platea",
    "dictumst",
  ];

  const safeParagraphs = Math.max(1, Math.min(8, paragraphs));
  const result: string[] = [];
  for (let paragraph = 0; paragraph < safeParagraphs; paragraph += 1) {
    const sentenceCount = 3 + Math.floor(Math.random() * 3);
    const sentences: string[] = [];

    for (let sentence = 0; sentence < sentenceCount; sentence += 1) {
      const wordCount = 8 + Math.floor(Math.random() * 8);
      const text = Array.from({ length: wordCount })
        .map(() => words[Math.floor(Math.random() * words.length)])
        .join(" ");
      sentences.push(`${text.charAt(0).toUpperCase()}${text.slice(1)}.`);
    }

    result.push(sentences.join(" "));
  }

  return result.join("\n\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unescapeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'");
}

function calculateHash(text: string, algorithm: "md5" | "sha1" | "sha256"): string {
  const seed = algorithm === "md5" ? 31 : algorithm === "sha1" ? 131 : 1313;
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * seed + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function summarizeText(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= 160) {
    return normalized;
  }
  return `${normalized.slice(0, 157)}...`;
}

function explainCode(value: string): string {
  const lines = value.split(/\r?\n/);
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  return `Code block with ${lines.length} lines (${nonEmpty.length} non-empty lines).`;
}

function executeToolById(
  toolId: string,
  input: string,
  options: ToolExecutionOptions,
): ServiceResponse<ToolExecutionResult> {
  const trimmedInput = input.trim();

  if (toolId === "uuid") {
    return ok({ output: generateUuid() });
  }

  if (toolId === "password") {
    const password = generatePassword(options.password);
    if (!password) {
      return fail("Password options produced an empty character set.");
    }
    return ok({ output: password });
  }

  if (toolId === "json-formatter") {
    if (!trimmedInput) {
      return fail("Input is required for JSON formatting.");
    }
    try {
      const parsed = JSON.parse(trimmedInput);
      return ok({ output: JSON.stringify(parsed, null, 2) });
    } catch {
      return fail("Invalid JSON input.");
    }
  }

  if (toolId === "base64") {
    if (!trimmedInput) {
      return fail("Input is required for Base64 conversion.");
    }
    if (options.mode === "decode") {
      const decoded = safeBase64Decode(trimmedInput);
      if (!decoded) {
        return fail("Unable to decode Base64 input.");
      }
      return ok({ output: decoded });
    }
    return ok({ output: safeBase64Encode(trimmedInput) });
  }

  if (toolId === "url-encode") {
    if (!trimmedInput) {
      return fail("Input is required for URL conversion.");
    }
    if (options.mode === "decode") {
      try {
        return ok({ output: decodeURIComponent(trimmedInput) });
      } catch {
        return fail("Invalid URL encoded input.");
      }
    }
    return ok({ output: encodeURIComponent(trimmedInput) });
  }

  if (toolId === "timestamp") {
    if (!trimmedInput) {
      return fail("Input is required for timestamp conversion.");
    }

    if (options.mode === "toDate") {
      const dateText = parseTimestampToDateString(trimmedInput);
      if (!dateText) {
        return fail("Invalid timestamp value.");
      }
      return ok({ output: dateText });
    }

    if (options.mode === "toTimestamp") {
      const timestamp = parseDateToTimestamp(trimmedInput);
      if (timestamp === null) {
        return fail("Invalid date value.");
      }
      return ok({ output: String(timestamp) });
    }

    const dateText = parseTimestampToDateString(trimmedInput);
    if (dateText) {
      return ok({ output: dateText, notice: "Auto-detected numeric timestamp input." });
    }
    const timestamp = parseDateToTimestamp(trimmedInput);
    if (timestamp === null) {
      return fail("Unable to auto-detect timestamp format.");
    }
    return ok({ output: String(timestamp), notice: "Auto-detected date input." });
  }

  if (toolId === "case-converter") {
    if (!trimmedInput) {
      return fail("Input is required for case conversion.");
    }
    const caseMode = options.caseMode || "camel";
    return ok({ output: convertCase(trimmedInput, caseMode) });
  }

  if (toolId === "text-generator") {
    const paragraphs = Math.max(1, Math.min(8, options.paragraphs || 2));
    return ok({ output: generateLoremIpsum(paragraphs) });
  }

  if (toolId === "hash") {
    if (!trimmedInput) {
      return fail("Input is required for hash calculation.");
    }
    const algorithm = options.hashAlgorithm || "sha256";
    return ok({ output: calculateHash(trimmedInput, algorithm) });
  }

  if (toolId === "html-escape") {
    if (!trimmedInput) {
      return fail("Input is required for HTML conversion.");
    }
    if (options.mode === "unescape") {
      return ok({ output: unescapeHtml(trimmedInput) });
    }
    return ok({ output: escapeHtml(trimmedInput) });
  }

  if (toolId === "qr-code") {
    if (!trimmedInput) {
      return fail("Input is required for QR payload generation.");
    }
    return ok({
      output: `QR:${trimmedInput}`,
      notice: "QR payload generated. Pass the output to your QR renderer.",
    });
  }

  if (toolId === "text-summarize") {
    if (!trimmedInput) {
      return fail("Input is required for text summarization.");
    }
    return ok({ output: summarizeText(trimmedInput) });
  }

  if (toolId === "code-explain") {
    if (!trimmedInput) {
      return fail("Input is required for code explanation.");
    }
    return ok({ output: explainCode(trimmedInput) });
  }

  return fail(`Unsupported tool: ${toolId}`);
}

function cloneTool(item: Tool): Tool {
  return {
    ...item,
  };
}

function cloneHistory(item: ToolHistory): ToolHistory {
  return {
    ...item,
  };
}

export const ToolsService = {
  getFavoriteToolIds(): string[] {
    return loadFavoriteToolIds();
  },

  isToolFavorite(toolId: string): boolean {
    return loadFavoriteToolIds().includes(toolId);
  },

  toggleFavoriteTool(toolId: string): boolean {
    const favorites = loadFavoriteToolIds();
    if (favorites.includes(toolId)) {
      saveFavoriteToolIds(favorites.filter((id) => id !== toolId));
      return false;
    }
    saveFavoriteToolIds([toolId, ...favorites]);
    return true;
  },

  getRecentToolIds(): string[] {
    return loadRecentToolIds();
  },

  markToolOpened(toolId: string): string[] {
    const recent = loadRecentToolIds();
    const next = [toolId, ...recent.filter((id) => id !== toolId)].slice(0, MAX_RECENT_TOOL_COUNT);
    saveRecentToolIds(next);
    return next;
  },

  resetWorkspaceState(): void {
    saveFavoriteToolIds([]);
    saveRecentToolIds([]);
    saveHistory([]);
  },

  async getTools(category?: ToolCategory): Promise<ServiceResponse<Tool[]>> {
    const filtered = category
      ? BUILTIN_TOOLS.filter((item) => item.category === category)
      : BUILTIN_TOOLS;
    return ok(filtered.map(cloneTool));
  },

  async getToolById(id: string): Promise<ServiceResponse<Tool | undefined>> {
    const tool = BUILTIN_TOOLS.find((item) => item.id === id);
    return ok(tool ? cloneTool(tool) : undefined);
  },

  async getPopularTools(): Promise<ServiceResponse<Tool[]>> {
    return ok(BUILTIN_TOOLS.filter((item) => item.isPopular).map(cloneTool));
  },

  async getNewTools(): Promise<ServiceResponse<Tool[]>> {
    return ok(BUILTIN_TOOLS.filter((item) => item.isNew).map(cloneTool));
  },

  async addHistory(
    toolId: string,
    toolName: string,
    input?: string,
    output?: string,
  ): Promise<ServiceResponse<ToolHistory>> {
    const now = Date.now();
    const history = loadHistory();

    const item: ToolHistory = {
      id: `tool_history_${now}_${Math.random().toString(36).slice(2, 10)}`,
      toolId,
      toolName,
      input,
      output,
      createTime: now,
      updateTime: now,
    };

    history.unshift(item);
    saveHistory(history);
    return ok(cloneHistory(item));
  },

  async getHistory(toolId?: string): Promise<ServiceResponse<ToolHistory[]>> {
    const history = loadHistory();
    const filtered = toolId ? history.filter((item) => item.toolId === toolId) : history;
    return ok(filtered.map(cloneHistory));
  },

  async executeTool(
    toolId: string,
    input: string,
    options: ToolExecutionOptions = {},
  ): Promise<ServiceResponse<ToolExecutionResult>> {
    const result = executeToolById(toolId, input, options);
    if (!result.success || !result.data) {
      return result;
    }

    if (hasSdkReservation()) {
      return {
        ...result,
        data: {
          ...result.data,
          notice:
            result.data.notice ||
            "Executed with local fallback while SDK tool bridge is reserved.",
        },
      };
    }

    return result;
  },
};

export default ToolsService;
