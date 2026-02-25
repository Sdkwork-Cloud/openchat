export enum ErrorCode {
  DATABASE_CONNECTION_FAILED = 'DB_001',
  DATABASE_QUERY_ERROR = 'DB_002',
  DATABASE_TIMEOUT = 'DB_003',
  DATABASE_CONSTRAINT_VIOLATION = 'DB_004',
  DATABASE_CONNECTION_POOL_EXHAUSTED = 'DB_005',

  REDIS_CONNECTION_FAILED = 'REDIS_001',
  REDIS_TIMEOUT = 'REDIS_002',
  REDIS_COMMAND_ERROR = 'REDIS_003',

  AUTH_INVALID_TOKEN = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_INVALID_CREDENTIALS = 'AUTH_003',
  AUTH_UNAUTHORIZED = 'AUTH_004',
  AUTH_FORBIDDEN = 'AUTH_005',

  USER_NOT_FOUND = 'USER_001',
  USER_ALREADY_EXISTS = 'USER_002',
  USER_INVALID_INPUT = 'USER_003',
  USER_BLOCKED = 'USER_004',

  FRIEND_REQUEST_NOT_FOUND = 'FRIEND_001',
  FRIEND_ALREADY_EXISTS = 'FRIEND_002',
  FRIEND_REQUEST_EXPIRED = 'FRIEND_003',
  FRIEND_BLOCKED = 'FRIEND_004',

  GROUP_NOT_FOUND = 'GROUP_001',
  GROUP_FULL = 'GROUP_002',
  GROUP_PERMISSION_DENIED = 'GROUP_003',
  GROUP_MEMBER_NOT_FOUND = 'GROUP_004',

  MESSAGE_NOT_FOUND = 'MSG_001',
  MESSAGE_SEND_FAILED = 'MSG_002',
  MESSAGE_TOO_LONG = 'MSG_003',
  MESSAGE_RECALL_TIMEOUT = 'MSG_004',

  FILE_UPLOAD_FAILED = 'FILE_001',
  FILE_TOO_LARGE = 'FILE_002',
  FILE_TYPE_NOT_ALLOWED = 'FILE_003',

  RTC_CHANNEL_NOT_FOUND = 'RTC_001',
  RTC_CONNECTION_FAILED = 'RTC_002',
  RTC_TOKEN_EXPIRED = 'RTC_003',

  VALIDATION_ERROR = 'VAL_001',
  INVALID_INPUT = 'VAL_002',
  MISSING_REQUIRED_FIELD = 'VAL_003',

  RATE_LIMIT_EXCEEDED = 'RATE_001',
  TOO_MANY_REQUESTS = 'RATE_002',

  INTERNAL_ERROR = 'SYS_001',
  SERVICE_UNAVAILABLE = 'SYS_002',
  TIMEOUT = 'SYS_003',
  NETWORK_ERROR = 'SYS_004',
  UNKNOWN_ERROR = 'SYS_999',
}

export enum ErrorModule {
  DATABASE = 'Database',
  REDIS = 'Redis',
  AUTH = 'Authentication',
  USER = 'User',
  FRIEND = 'Friend',
  GROUP = 'Group',
  MESSAGE = 'Message',
  FILE = 'File',
  RTC = 'RTC',
  VALIDATION = 'Validation',
  RATE_LIMIT = 'RateLimit',
  SYSTEM = 'System',
  WEBSOCKET = 'WebSocket',
  IM_PROVIDER = 'IMProvider',
  AGENT = 'Agent',
  BOT = 'Bot',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorSolution {
  description: string;
  actions: string[];
  documentation?: string;
}

export const ErrorSolutions: Record<ErrorCode, ErrorSolution> = {
  [ErrorCode.DATABASE_CONNECTION_FAILED]: {
    description: 'Unable to establish connection to the database server',
    actions: [
      'Verify the database service is running',
      'Check network connectivity between application and database',
      'Verify database credentials in .env file',
      'Check if the database host and port are correct',
      'Verify firewall rules allow the connection',
    ],
    documentation: 'docs/database-setup.md#troubleshooting',
  },
  [ErrorCode.DATABASE_QUERY_ERROR]: {
    description: 'Database query execution failed',
    actions: [
      'Check the SQL query syntax',
      'Verify table and column names exist',
      'Check database user permissions',
      'Review application logs for query details',
    ],
  },
  [ErrorCode.DATABASE_TIMEOUT]: {
    description: 'Database operation timed out',
    actions: [
      'Check database server load',
      'Optimize slow queries',
      'Increase connection timeout setting',
      'Check for database locks',
    ],
  },
  [ErrorCode.DATABASE_CONSTRAINT_VIOLATION]: {
    description: 'Database constraint violation occurred',
    actions: [
      'Check for duplicate entries',
      'Verify foreign key references exist',
      'Check NOT NULL constraints',
      'Review data before submission',
    ],
  },
  [ErrorCode.DATABASE_CONNECTION_POOL_EXHAUSTED]: {
    description: 'Database connection pool is exhausted',
    actions: [
      'Increase DB_POOL_MAX in .env',
      'Check for connection leaks in code',
      'Monitor connection usage patterns',
      'Consider implementing connection queuing',
    ],
  },
  [ErrorCode.REDIS_CONNECTION_FAILED]: {
    description: 'Unable to connect to Redis server',
    actions: [
      'Verify Redis service is running',
      'Check Redis host and port configuration',
      'Verify Redis password if authentication is enabled',
      'Check firewall rules',
    ],
  },
  [ErrorCode.REDIS_TIMEOUT]: {
    description: 'Redis operation timed out',
    actions: [
      'Check Redis server load',
      'Increase Redis timeout setting',
      'Check for slow Redis commands',
      'Monitor Redis memory usage',
    ],
  },
  [ErrorCode.REDIS_COMMAND_ERROR]: {
    description: 'Redis command execution failed',
    actions: [
      'Check Redis command syntax',
      'Verify Redis version compatibility',
      'Check Redis server logs',
    ],
  },
  [ErrorCode.AUTH_INVALID_TOKEN]: {
    description: 'Invalid authentication token provided',
    actions: [
      'Verify token format is correct',
      'Check if token has been tampered with',
      'Request a new token via login',
    ],
  },
  [ErrorCode.AUTH_TOKEN_EXPIRED]: {
    description: 'Authentication token has expired',
    actions: [
      'Request a new token via login',
      'Use refresh token to get new access token',
      'Check token expiration settings',
    ],
  },
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: {
    description: 'Invalid username or password',
    actions: [
      'Verify username and password are correct',
      'Check if account exists',
      'Check if account is locked',
      'Try password reset if forgotten',
    ],
  },
  [ErrorCode.AUTH_UNAUTHORIZED]: {
    description: 'User is not authenticated',
    actions: [
      'Login to get access token',
      'Include Authorization header with Bearer token',
      'Check if token is still valid',
    ],
  },
  [ErrorCode.AUTH_FORBIDDEN]: {
    description: 'User does not have permission for this action',
    actions: [
      'Contact administrator for access',
      'Verify user role and permissions',
      'Check if resource belongs to user',
    ],
  },
  [ErrorCode.USER_NOT_FOUND]: {
    description: 'Requested user does not exist',
    actions: [
      'Verify user ID is correct',
      'Check if user has been deleted',
      'Search for user by other criteria',
    ],
  },
  [ErrorCode.USER_ALREADY_EXISTS]: {
    description: 'User with this identifier already exists',
    actions: [
      'Use a different username',
      'Use a different email address',
      'Try logging in instead of registering',
    ],
  },
  [ErrorCode.USER_INVALID_INPUT]: {
    description: 'Invalid user input provided',
    actions: [
      'Check input format and constraints',
      'Verify required fields are provided',
      'Check field length limits',
    ],
  },
  [ErrorCode.USER_BLOCKED]: {
    description: 'User account has been blocked',
    actions: [
      'Contact administrator',
      'Review account status',
      'Submit appeal if applicable',
    ],
  },
  [ErrorCode.FRIEND_REQUEST_NOT_FOUND]: {
    description: 'Friend request does not exist',
    actions: [
      'Verify request ID is correct',
      'Check if request has been processed',
      'Send a new friend request',
    ],
  },
  [ErrorCode.FRIEND_ALREADY_EXISTS]: {
    description: 'Friendship already exists',
    actions: [
      'Check existing friends list',
      'No action needed if already friends',
    ],
  },
  [ErrorCode.FRIEND_REQUEST_EXPIRED]: {
    description: 'Friend request has expired',
    actions: [
      'Send a new friend request',
      'Check request expiration settings',
    ],
  },
  [ErrorCode.FRIEND_BLOCKED]: {
    description: 'User has been blocked',
    actions: [
      'Cannot send friend request to blocked user',
      'Check block list',
    ],
  },
  [ErrorCode.GROUP_NOT_FOUND]: {
    description: 'Group does not exist',
    actions: [
      'Verify group ID is correct',
      'Check if group has been dismissed',
      'Search for group by name',
    ],
  },
  [ErrorCode.GROUP_FULL]: {
    description: 'Group has reached maximum member limit',
    actions: [
      'Wait for members to leave',
      'Contact group admin',
      'Request group capacity increase',
    ],
  },
  [ErrorCode.GROUP_PERMISSION_DENIED]: {
    description: 'Insufficient permissions for group action',
    actions: [
      'Verify user role in group',
      'Contact group admin',
      'Request necessary permissions',
    ],
  },
  [ErrorCode.GROUP_MEMBER_NOT_FOUND]: {
    description: 'User is not a member of this group',
    actions: [
      'Join the group first',
      'Check membership status',
      'Request invitation',
    ],
  },
  [ErrorCode.MESSAGE_NOT_FOUND]: {
    description: 'Message does not exist',
    actions: [
      'Verify message ID is correct',
      'Check if message has been deleted',
      'Check message retention policy',
    ],
  },
  [ErrorCode.MESSAGE_SEND_FAILED]: {
    description: 'Failed to send message',
    actions: [
      'Check network connection',
      'Verify recipient exists',
      'Try again later',
    ],
  },
  [ErrorCode.MESSAGE_TOO_LONG]: {
    description: 'Message exceeds maximum length',
    actions: [
      'Reduce message length',
      'Split into multiple messages',
      'Use file attachment for long content',
    ],
  },
  [ErrorCode.MESSAGE_RECALL_TIMEOUT]: {
    description: 'Message recall time limit exceeded',
    actions: [
      'Messages can only be recalled within time limit',
      'Check message recall settings',
    ],
  },
  [ErrorCode.FILE_UPLOAD_FAILED]: {
    description: 'File upload failed',
    actions: [
      'Check file size and type',
      'Verify storage service is available',
      'Try again later',
    ],
  },
  [ErrorCode.FILE_TOO_LARGE]: {
    description: 'File size exceeds limit',
    actions: [
      'Reduce file size',
      'Compress the file',
      'Use alternative upload method',
    ],
  },
  [ErrorCode.FILE_TYPE_NOT_ALLOWED]: {
    description: 'File type is not allowed',
    actions: [
      'Check allowed file types',
      'Convert file to allowed format',
    ],
  },
  [ErrorCode.RTC_CHANNEL_NOT_FOUND]: {
    description: 'RTC channel does not exist',
    actions: [
      'Verify channel ID is correct',
      'Check if channel has been closed',
      'Create a new channel',
    ],
  },
  [ErrorCode.RTC_CONNECTION_FAILED]: {
    description: 'RTC connection failed',
    actions: [
      'Check network connectivity',
      'Verify TURN/STUN server configuration',
      'Try reconnecting',
    ],
  },
  [ErrorCode.RTC_TOKEN_EXPIRED]: {
    description: 'RTC token has expired',
    actions: [
      'Request new RTC token',
      'Refresh the call',
    ],
  },
  [ErrorCode.VALIDATION_ERROR]: {
    description: 'Input validation failed',
    actions: [
      'Check input format',
      'Verify required fields',
      'Review validation constraints',
    ],
  },
  [ErrorCode.INVALID_INPUT]: {
    description: 'Invalid input provided',
    actions: [
      'Check input format',
      'Verify data types',
      'Review field constraints',
    ],
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    description: 'Required field is missing',
    actions: [
      'Provide all required fields',
      'Check API documentation',
    ],
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    description: 'Rate limit has been exceeded',
    actions: [
      'Wait before making more requests',
      'Check rate limit headers',
      'Implement request throttling',
    ],
  },
  [ErrorCode.TOO_MANY_REQUESTS]: {
    description: 'Too many requests in a short period',
    actions: [
      'Slow down request frequency',
      'Implement exponential backoff',
      'Check rate limit settings',
    ],
  },
  [ErrorCode.INTERNAL_ERROR]: {
    description: 'Internal server error occurred',
    actions: [
      'Try again later',
      'Contact support if error persists',
      'Check server logs for details',
    ],
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    description: 'Service is temporarily unavailable',
    actions: [
      'Wait and try again',
      'Check service status page',
      'Contact support if issue persists',
    ],
  },
  [ErrorCode.TIMEOUT]: {
    description: 'Request timed out',
    actions: [
      'Check network connection',
      'Try again with simpler request',
      'Increase timeout setting if applicable',
    ],
  },
  [ErrorCode.NETWORK_ERROR]: {
    description: 'Network error occurred',
    actions: [
      'Check network connectivity',
      'Verify server is accessible',
      'Check firewall settings',
    ],
  },
  [ErrorCode.UNKNOWN_ERROR]: {
    description: 'An unknown error occurred',
    actions: [
      'Try again',
      'Contact support with error details',
      'Check application logs',
    ],
  },
};

export function getErrorSolution(errorCode: ErrorCode): ErrorSolution {
  return ErrorSolutions[errorCode] || ErrorSolutions[ErrorCode.UNKNOWN_ERROR];
}

export function mapSystemErrorToErrorCode(error: any): ErrorCode {
  const code = error?.code || error?.errno;
  const message = error?.message?.toLowerCase() || '';

  if (code === 'ECONNRESET' || code === -4077) {
    return ErrorCode.DATABASE_CONNECTION_FAILED;
  }
  if (code === 'ETIMEDOUT' || code === 'ETIMEOUT') {
    return ErrorCode.TIMEOUT;
  }
  if (code === 'ECONNREFUSED') {
    return ErrorCode.DATABASE_CONNECTION_FAILED;
  }
  if (code === 'ENOTFOUND') {
    return ErrorCode.NETWORK_ERROR;
  }
  if (code === '23505') {
    return ErrorCode.DATABASE_CONSTRAINT_VIOLATION;
  }
  if (code === '23503') {
    return ErrorCode.DATABASE_CONSTRAINT_VIOLATION;
  }
  if (code === '23502') {
    return ErrorCode.DATABASE_CONSTRAINT_VIOLATION;
  }
  if (code === '08006') {
    return ErrorCode.DATABASE_CONNECTION_FAILED;
  }
  if (code === '08001') {
    return ErrorCode.DATABASE_CONNECTION_FAILED;
  }
  if (message.includes('connection') && message.includes('refused')) {
    return ErrorCode.DATABASE_CONNECTION_FAILED;
  }
  if (message.includes('timeout')) {
    return ErrorCode.TIMEOUT;
  }
  if (message.includes('jwt') || message.includes('token')) {
    if (message.includes('expired')) {
      return ErrorCode.AUTH_TOKEN_EXPIRED;
    }
    return ErrorCode.AUTH_INVALID_TOKEN;
  }
  if (message.includes('unauthorized')) {
    return ErrorCode.AUTH_UNAUTHORIZED;
  }
  if (message.includes('forbidden')) {
    return ErrorCode.AUTH_FORBIDDEN;
  }
  if (message.includes('not found')) {
    return ErrorCode.INTERNAL_ERROR;
  }
  if (message.includes('validation')) {
    return ErrorCode.VALIDATION_ERROR;
  }

  return ErrorCode.INTERNAL_ERROR;
}

export function determineErrorModule(error: any, context?: string): ErrorModule {
  const message = error?.message?.toLowerCase() || '';
  const contextLower = context?.toLowerCase() || '';

  if (message.includes('database') || message.includes('postgres') || message.includes('sql')) {
    return ErrorModule.DATABASE;
  }
  if (message.includes('redis')) {
    return ErrorModule.REDIS;
  }
  if (message.includes('jwt') || message.includes('token') || message.includes('auth')) {
    return ErrorModule.AUTH;
  }
  if (contextLower.includes('user')) {
    return ErrorModule.USER;
  }
  if (contextLower.includes('friend')) {
    return ErrorModule.FRIEND;
  }
  if (contextLower.includes('group')) {
    return ErrorModule.GROUP;
  }
  if (contextLower.includes('message')) {
    return ErrorModule.MESSAGE;
  }
  if (contextLower.includes('file') || contextLower.includes('upload')) {
    return ErrorModule.FILE;
  }
  if (contextLower.includes('rtc') || contextLower.includes('video') || contextLower.includes('audio')) {
    return ErrorModule.RTC;
  }
  if (contextLower.includes('websocket') || contextLower.includes('socket')) {
    return ErrorModule.WEBSOCKET;
  }
  if (contextLower.includes('im') || contextLower.includes('wukong')) {
    return ErrorModule.IM_PROVIDER;
  }
  if (contextLower.includes('agent')) {
    return ErrorModule.AGENT;
  }
  if (contextLower.includes('bot')) {
    return ErrorModule.BOT;
  }

  return ErrorModule.SYSTEM;
}

export function determineErrorSeverity(errorCode: ErrorCode): ErrorSeverity {
  const criticalErrors = [
    ErrorCode.DATABASE_CONNECTION_FAILED,
    ErrorCode.DATABASE_CONNECTION_POOL_EXHAUSTED,
    ErrorCode.REDIS_CONNECTION_FAILED,
    ErrorCode.SERVICE_UNAVAILABLE,
  ];

  const highErrors = [
    ErrorCode.DATABASE_TIMEOUT,
    ErrorCode.REDIS_TIMEOUT,
    ErrorCode.AUTH_TOKEN_EXPIRED,
    ErrorCode.AUTH_INVALID_TOKEN,
    ErrorCode.RATE_LIMIT_EXCEEDED,
  ];

  const mediumErrors = [
    ErrorCode.AUTH_UNAUTHORIZED,
    ErrorCode.AUTH_FORBIDDEN,
    ErrorCode.AUTH_INVALID_CREDENTIALS,
    ErrorCode.USER_NOT_FOUND,
    ErrorCode.GROUP_NOT_FOUND,
    ErrorCode.MESSAGE_NOT_FOUND,
  ];

  if (criticalErrors.includes(errorCode)) {
    return ErrorSeverity.CRITICAL;
  }
  if (highErrors.includes(errorCode)) {
    return ErrorSeverity.HIGH;
  }
  if (mediumErrors.includes(errorCode)) {
    return ErrorSeverity.MEDIUM;
  }
  return ErrorSeverity.LOW;
}
