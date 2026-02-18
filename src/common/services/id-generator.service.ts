import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

export type IdType = 'uuid' | 'ulid' | 'snowflake' | 'nanoid' | 'short' | 'long';

export interface IdConfig {
  type: IdType;
  prefix?: string;
  suffix?: string;
}

@Injectable()
export class IdGeneratorService {
  private readonly logger = new Logger(IdGeneratorService.name);
  private readonly machineId: number;
  private sequence: number = 0;
  private lastTimestamp: number = 0;

  constructor(private readonly configService: ConfigService) {
    this.machineId = this.configService.get<number>('MACHINE_ID', 1);
  }

  generate(config?: Partial<IdConfig>): string {
    const type = config?.type || 'uuid';
    let id: string;

    switch (type) {
      case 'uuid':
        id = this.generateUuid();
        break;
      case 'ulid':
        id = this.generateUlid();
        break;
      case 'snowflake':
        id = this.generateSnowflake();
        break;
      case 'nanoid':
        id = this.generateNanoId();
        break;
      case 'short':
        id = this.generateShortId();
        break;
      case 'long':
        id = this.generateLongId();
        break;
      default:
        id = this.generateUuid();
    }

    if (config?.prefix) {
      id = `${config.prefix}_${id}`;
    }

    if (config?.suffix) {
      id = `${id}_${config.suffix}`;
    }

    return id;
  }

  uuid(): string {
    return this.generateUuid();
  }

  ulid(): string {
    return this.generateUlid();
  }

  snowflake(): string {
    return this.generateSnowflake();
  }

  nanoid(size: number = 21): string {
    return this.generateNanoId(size);
  }

  shortId(): string {
    return this.generateShortId();
  }

  longId(): string {
    return this.generateLongId();
  }

  objectId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const machineId = createHash('md5')
      .update(this.machineId.toString())
      .digest('hex')
      .slice(0, 6);
    const processId = process.pid.toString(16).padStart(4, '0');
    const counter = randomBytes(3).toString('hex');

    return timestamp + machineId + processId + counter;
  }

  transactionId(): string {
    return this.generate({ type: 'ulid', prefix: 'tx' });
  }

  requestId(): string {
    return this.generate({ type: 'nanoid', prefix: 'req' });
  }

  sessionId(): string {
    return this.generate({ type: 'nanoid', prefix: 'sess' });
  }

  messageId(): string {
    return this.generate({ type: 'snowflake', prefix: 'msg' });
  }

  conversationId(): string {
    return this.generate({ type: 'ulid', prefix: 'conv' });
  }

  groupId(): string {
    return this.generate({ type: 'snowflake', prefix: 'grp' });
  }

  userId(): string {
    return this.generate({ type: 'snowflake', prefix: 'usr' });
  }

  friendRequestId(): string {
    return this.generate({ type: 'ulid', prefix: 'freq' });
  }

  invitationId(): string {
    return this.generate({ type: 'ulid', prefix: 'inv' });
  }

  deterministicId(input: string, namespace?: string): string {
    const data = namespace ? `${namespace}:${input}` : input;
    return createHash('sha256').update(data).digest('hex').slice(0, 24);
  }

  compositeId(...parts: string[]): string {
    const joined = parts.join(':');
    return createHash('sha256').update(joined).digest('hex').slice(0, 32);
  }

  private generateUuid(): string {
    const bytes = randomBytes(16);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytes.toString('hex');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  private generateUlid(): string {
    const timestamp = Date.now();
    const random = randomBytes(10);

    const timeBytes = Buffer.alloc(6);
    timeBytes.writeUIntBE(timestamp, 0, 6);

    const ulidBytes = Buffer.concat([timeBytes, random]);

    return this.encodeBase32(ulidBytes);
  }

  private generateSnowflake(): string {
    const epoch = 1704067200000;
    const now = Date.now();
    const timestamp = now - epoch;

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 4095;

      if (this.sequence === 0) {
        while (Date.now() - epoch <= this.lastTimestamp) {
          // Wait for next millisecond
        }
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    const id = (BigInt(timestamp) << 22n) |
               (BigInt(this.machineId & 1023) << 12n) |
               BigInt(this.sequence);

    return id.toString();
  }

  private generateNanoId(size: number = 21): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = randomBytes(size);
    let id = '';

    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i] % alphabet.length];
    }

    return id;
  }

  private generateShortId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    return `${timestamp}${random}`;
  }

  private generateLongId(): string {
    const timestamp = Date.now().toString();
    const random = randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(`${timestamp}${random}`)
      .digest('hex');
    return hash;
  }

  private encodeBase32(buffer: Buffer): string {
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }
}

export function generateId(type?: IdType): string {
  const service = new IdGeneratorService({ get: () => undefined } as any);
  return service.generate({ type });
}
