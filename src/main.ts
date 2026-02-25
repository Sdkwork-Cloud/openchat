import { bootstrap } from './bootstrap';
import { Logger } from '@nestjs/common';
import {
  ErrorCode,
  ErrorSeverity,
  mapSystemErrorToErrorCode,
  getErrorSolution,
} from './common/constants/error-codes';

const logger = new Logger('Bootstrap');

function handleStartupError(error: Error): void {
  const errorMsg = error.message || '';
  const errorCode = mapSystemErrorToErrorCode(error);
  const severity = ErrorSeverity.CRITICAL;
  const solution = getErrorSolution(errorCode);

  printModuleError('Application', 'StartupFailed', errorMsg, {
    errorCode,
    severity,
    stack: error.stack,
    suggestions: solution.actions,
  });

  process.exit(1);
}

function printModuleError(
  module: string,
  errorType: string,
  message: string,
  options?: {
    errorCode?: ErrorCode;
    severity?: ErrorSeverity;
    stack?: string;
    suggestions?: string[];
    details?: Record<string, any>;
  }
): void {
  const errorCode = options?.errorCode || ErrorCode.INTERNAL_ERROR;
  const severity = options?.severity || ErrorSeverity.HIGH;
  const solution = getErrorSolution(errorCode);

  const red = '\x1b[31m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const yellow = '\x1b[33m';
  const bgRed = '\x1b[41m';
  const time = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

  let output = '';

  if (severity === ErrorSeverity.CRITICAL) {
    output = `\n${bgRed}${' '.repeat(67)}${reset}\n`;
    output += `${bgRed}${red}  ${bold}!!! CRITICAL ERROR !!!${reset}${bgRed}                                      ${reset}\n`;
    output += `${bgRed}${' '.repeat(67)}${reset}\n`;
  }

  output += `\n${red}╔═════════════════════════════════════════════════════════════════════╗${reset}\n`;
  output += `${red}║${reset} ${bold}${severity}${reset} - ${time}\n`;
  output += `${red}╠═════════════════════════════════════════════════════════════════════╣${reset}\n`;
  output += `${red}║${reset} ${yellow}Module:${reset}     ${module}\n`;
  output += `${red}║${reset} ${yellow}Error Type:${reset} ${errorType}\n`;
  output += `${red}║${reset} ${yellow}Error Code:${reset} ${errorCode}\n`;
  output += `${red}║${reset} ${yellow}Message:${reset}    ${message}\n`;

  if (options?.details) {
    for (const [key, value] of Object.entries(options.details)) {
      output += `${red}║${reset} ${yellow}${key}:${reset} ${value}\n`;
    }
  }

  const suggestions = options?.suggestions || solution.actions;
  if (suggestions && suggestions.length > 0) {
    output += `${red}║${reset} ${yellow}Suggestions:${reset}\n`;
    for (const suggestion of suggestions.slice(0, 4)) {
      output += `${red}║${reset}   - ${suggestion}\n`;
    }
  }

  if (options?.stack) {
    const stackLines = options.stack.split('\n').slice(0, 3);
    output += `${red}║${reset} ${yellow}Stack:${reset}\n`;
    for (const line of stackLines) {
      output += `${red}║${reset}   ${line.trim()}\n`;
    }
  }

  output += `${red}╚═════════════════════════════════════════════════════════════════════╝${reset}\n`;

  process.stderr.write(output);
}

process.on('uncaughtException', handleStartupError);
process.on('unhandledRejection', (reason) => {
  if (reason instanceof Error) {
    handleStartupError(reason);
  } else {
    printModuleError('Application', 'UnhandledRejection', String(reason), {
      errorCode: ErrorCode.UNKNOWN_ERROR,
      severity: ErrorSeverity.HIGH,
    });
    process.exit(1);
  }
});

bootstrap().catch(handleStartupError);
