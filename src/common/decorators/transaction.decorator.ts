/**
 * 事务装饰器
 * 提供声明式事务管理
 *
 * @framework
 */

import { SetMetadata, applyDecorators, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';

/**
 * 事务隔离级别
 */
export enum IsolationLevel {
  /** 读未提交 */
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  /** 读已提交 */
  READ_COMMITTED = 'READ COMMITTED',
  /** 可重复读 */
  REPEATABLE_READ = 'REPEATABLE READ',
  /** 串行化 */
  SERIALIZABLE = 'SERIALIZABLE',
  /** 快照隔离 */
  SNAPSHOT = 'SNAPSHOT',
}

/**
 * 事务选项
 */
export interface TransactionOptions {
  /** 数据源名称 */
  dataSource?: string;
  /** 隔离级别 */
  isolation?: IsolationLevel;
  /** 只读事务 */
  readOnly?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 回滚条件 */
  rollbackOn?: (error: any) => boolean;
  /** 提交钩子 */
  afterCommit?: () => void | Promise<void>;
  /** 回滚钩子 */
  afterRollback?: (error: any) => void | Promise<void>;
}

/**
 * 事务元数据
 */
export const TRANSACTION_OPTIONS_METADATA = 'transaction:options';

/**
 * 事务装饰器
 *
 * @example
 * // 基本用法
 * @Transaction()
 * async createUser(data: CreateUserData) {
 *   return this.userService.create(data);
 * }
 *
 * @example
 * // 自定义隔离级别
 * @Transaction({ isolation: IsolationLevel.SERIALIZABLE })
 * async transfer(from: string, to: string, amount: number) {
 *   return this.accountService.transfer(from, to, amount);
 * }
 *
 * @example
 * // 带重试
 * @Transaction({ retries: 3, retryDelay: 1000 })
 * async processPayment(payment: Payment) {
 *   return this.paymentService.process(payment);
 * }
 */
export function Transaction(options: TransactionOptions = {}): MethodDecorator {
  return applyDecorators(
    SetMetadata(TRANSACTION_OPTIONS_METADATA, options),
  );
}

/**
 * 只读事务装饰器
 */
export function ReadOnlyTransaction(): MethodDecorator {
  return Transaction({ readOnly: true });
}

/**
 * 事务拦截器
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const options = Reflect.getMetadata(
      TRANSACTION_OPTIONS_METADATA,
      context.getHandler(),
    ) as TransactionOptions | undefined;

    if (!options) {
      return next.handle();
    }

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      
      if (options.isolation) {
        await queryRunner.startTransaction(options.isolation as any);
      } else if (options.readOnly !== undefined) {
        await queryRunner.startTransaction();
      } else {
        await queryRunner.startTransaction();
      }

      const result = await next.handle().toPromise();

      await queryRunner.commitTransaction();

      // 执行提交后钩子
      if (options.afterCommit) {
        await options.afterCommit();
      }

      return new Observable(observer => {
        observer.next(result);
        observer.complete();
      });
    } catch (error) {
      // 检查是否需要回滚
      if (options.rollbackOn && !options.rollbackOn(error)) {
        await queryRunner.commitTransaction();
        throw error;
      }

      await queryRunner.rollbackTransaction();

      // 执行回滚后钩子
      if (options.afterRollback) {
        await options.afterRollback(error);
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

/**
 * 在事务内执行装饰器
 * 用于在已有事务中执行操作
 *
 * @example
 * @InTransaction()
 * async updateUserData(userId: string, data: UpdateUserData) {
 *   // 自动使用当前事务
 *   return this.userRepository.update(userId, data);
 * }
 */
export function InTransaction(): MethodDecorator {
  return SetMetadata('transaction:in-existing', true);
}

/**
 * 需要新事务装饰器
 * 总是创建新的事务
 *
 * @example
 * @RequireNewTransaction()
 * async logAudit(audit: Audit) {
 *   // 总是创建新事务，不受外部事务影响
 *   return this.auditRepository.save(audit);
 * }
 */
export function RequireNewTransaction(): MethodDecorator {
  return SetMetadata('transaction:require-new', true);
}

/**
 * 传播行为枚举
 */
export enum Propagation {
  /** 支持当前事务，如果没有则非事务执行 */
  SUPPORTS = 'SUPPORTS',
  /** 不支持当前事务，如果存在则挂起 */
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  /** 强制非事务执行 */
  NEVER = 'NEVER',
  /** 嵌套事务 */
  NESTED = 'NESTED',
}

/**
 * 事务传播装饰器
 *
 * @example
 * @TransactionPropagation(Propagation.NESTED)
 * async nestedOperation() {
 *   // 在嵌套事务中执行
 * }
 */
export function TransactionPropagation(propagation: Propagation): MethodDecorator {
  return SetMetadata('transaction:propagation', propagation);
}
