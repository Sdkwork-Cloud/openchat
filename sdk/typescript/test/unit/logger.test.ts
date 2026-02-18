import { Logger, LogLevel, createLogger, getLogger, setGlobalLogger } from '../../src/core/logger';

describe('Logger', () => {
  let mockConsole: {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    group: jest.Mock;
    groupEnd: jest.Mock;
    time: jest.Mock;
    timeEnd: jest.Mock;
    table: jest.Mock;
  };

  beforeEach(() => {
    mockConsole = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      group: jest.fn(),
      groupEnd: jest.fn(),
      time: jest.fn(),
      timeEnd: jest.fn(),
      table: jest.fn(),
    };
    
    (global as any).console = mockConsole;
  });

  describe('基本功能测试', () => {
    it('应该能够创建Logger实例', () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('应该能够设置日志级别', () => {
      const logger = new Logger({ level: LogLevel.WARN });
      expect(logger.getLevel()).toBe(LogLevel.WARN);
      
      logger.setLevel(LogLevel.DEBUG);
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('默认日志级别应该是WARN', () => {
      const logger = new Logger();
      expect(logger.getLevel()).toBe(LogLevel.WARN);
    });
  });

  describe('日志级别过滤测试', () => {
    it('DEBUG级别应该输出所有日志', () => {
      const logger = new Logger({ level: LogLevel.DEBUG, colorize: false });
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      expect(mockConsole.debug).toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('INFO级别应该过滤DEBUG日志', () => {
      const logger = new Logger({ level: LogLevel.INFO, colorize: false });
      
      logger.debug('debug message');
      logger.info('info message');
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('WARN级别应该过滤DEBUG和INFO日志', () => {
      const logger = new Logger({ level: LogLevel.WARN, colorize: false });
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('ERROR级别应该只输出ERROR日志', () => {
      const logger = new Logger({ level: LogLevel.ERROR, colorize: false });
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('NONE级别应该不输出任何日志', () => {
      const logger = new Logger({ level: LogLevel.NONE, colorize: false });
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('格式化测试', () => {
    it('应该包含时间戳', () => {
      const logger = new Logger({ level: LogLevel.INFO, timestamp: true, colorize: false });
      
      logger.info('test message');
      
      const call = mockConsole.info.mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('应该包含前缀', () => {
      const logger = new Logger({ level: LogLevel.INFO, prefix: '[Test]', timestamp: false, colorize: false });
      
      logger.info('test message');
      
      const call = mockConsole.info.mock.calls[0][0];
      expect(call).toContain('[Test]');
    });

    it('应该包含日志级别', () => {
      const logger = new Logger({ level: LogLevel.INFO, timestamp: false, colorize: false });
      
      logger.info('test message');
      
      const call = mockConsole.info.mock.calls[0][0];
      expect(call).toContain('[INFO]');
    });
  });

  describe('自定义处理器测试', () => {
    it('应该使用自定义处理器', () => {
      const customHandler = jest.fn();
      const logger = new Logger({ 
        level: LogLevel.INFO, 
        customHandler 
      });
      
      logger.info('test message', { key: 'value' });
      
      expect(customHandler).toHaveBeenCalledWith(LogLevel.INFO, 'test message', { key: 'value' });
    });
  });

  describe('子Logger测试', () => {
    it('应该能够创建子Logger', () => {
      const parent = new Logger({ level: LogLevel.DEBUG, prefix: '[Parent]' });
      const child = parent.child('Child');
      
      child.info('test message');
      
      const call = mockConsole.info.mock.calls[0][0];
      expect(call).toContain('[Parent]:Child');
    });
  });

  describe('工具方法测试', () => {
    it('应该支持group/groupEnd', () => {
      const logger = new Logger({ prefix: '[Test]' });
      
      logger.group('test group');
      logger.groupEnd();
      
      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('应该支持time/timeEnd', () => {
      const logger = new Logger({ prefix: '[Test]' });
      
      logger.time('test timer');
      logger.timeEnd('test timer');
      
      expect(mockConsole.time).toHaveBeenCalled();
      expect(mockConsole.timeEnd).toHaveBeenCalled();
    });

    it('应该支持table', () => {
      const logger = new Logger();
      
      logger.table({ a: 1, b: 2 });
      
      expect(mockConsole.table).toHaveBeenCalled();
    });
  });

  describe('工厂函数测试', () => {
    it('createLogger应该创建Logger实例', () => {
      const logger = createLogger({ level: LogLevel.DEBUG });
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('getLogger应该返回全局Logger', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });

    it('setGlobalLogger应该设置全局Logger', () => {
      const customLogger = new Logger({ level: LogLevel.ERROR });
      setGlobalLogger(customLogger);
      
      const logger = getLogger();
      expect(logger).toBe(customLogger);
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });
  });
});
