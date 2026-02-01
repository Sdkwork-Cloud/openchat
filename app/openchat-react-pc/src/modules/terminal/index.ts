/**
 * Terminal 模块
 * 
 * 终端功能模块的统一导出
 */

// 实体
export type { TerminalSession, TerminalSessionStatus } from './entities/terminalSession.entity';
export {
  createTerminalSession,
  updateTerminalSessionStatus,
  updateTerminalSessionCwd,
} from './entities/terminalSession.entity';

// 服务
export { terminalService } from './services/terminalService';

// 常量
export const TERMINAL_MODULE_NAME = 'terminal';

// 默认导出
export { default } from './services/terminalService';
