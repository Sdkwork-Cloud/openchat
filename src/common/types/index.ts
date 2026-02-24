/**
 * 通用类型定义
 * 提供框架级别的类型工具
 *
 * @framework
 */

/**
 * 可选类型 - 使所有属性变为可选
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * 只读类型 - 使所有属性变为只读
 */
export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

/**
 * 部分只读 - 使指定属性变为只读
 */
export type ReadonlyKeys<T, K extends keyof T> = {
  readonly [P in K]: T[P];
} & {
  [P in Exclude<keyof T, K>]: T[P];
};

/**
 * 必填类型 - 使所有属性变为必填
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * 部分必填 - 使指定属性变为必填
 */
export type RequiredKeys<T, K extends keyof T> = {
  -readonly [P in K]-?: T[P];
} & {
  [P in Exclude<keyof T, K>]: T[P];
};

/**
 * 排除 null 和 undefined
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * 排除指定类型
 */
export type ExcludeType<T, U> = T extends U ? never : T;

/**
 * 提取指定类型
 */
export type ExtractType<T, U> = T extends U ? T : never;

/**
 * 深度部分类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 深度只读类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 深度必填类型
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * 映射类型 - 转换属性类型
 */
export type MapValue<T, U> = {
  [P in keyof T]: U;
};

/**
 * 映射类型 - 转换属性名
 */
export type MapKeys<T, K extends string> = {
  [P in keyof T as K]: T[P];
};

/**
 * 联合类型转元组
 */
export type UnionToTuple<U, T extends any[] = []> = (
  (U extends any ? (t: U) => U : never) extends infer V
    ? V extends (t: infer W) => infer _
      ? UnionToTuple<Exclude<U, W>, [W, ...T]>
      : T
    : T
);

/**
 * 联合类型转交集
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * 函数参数类型
 */
export type Parameters<T extends (...args: any[]) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : never;

/**
 * 函数返回值类型
 */
export type ReturnType<T extends (...args: any[]) => any> = T extends (
  ...args: any[]
) => infer R
  ? R
  : never;

/**
 * 函数实例类型
 */
export type InstanceType<T extends new (...args: any[]) => any> = T extends new (
  ...args: any[]
) => infer R
  ? R
  : never;

/**
 * 构造函数参数类型
 */
export type ConstructorParameters<T extends new (...args: any[]) => any> = T extends new (
  ...args: infer P
) => any
  ? P
  : never;

/**
 * 异步类型 - 将返回值包装为 Promise
 */
export type Async<T> = Promise<T>;

/**
 * 可能异步类型
 */
export type MaybeAsync<T> = T | Promise<T>;

/**
 * 数组元素类型
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * 元组元素类型
 */
export type TupleElement<T extends readonly any[]> = T extends readonly (infer U)[] ? U : never;

/**
 * 对象值类型
 */
export type ValueOf<T> = T[keyof T];

/**
 * 对象键类型
 */
export type KeyOf<T> = keyof T;

/**
 * 字符串字面量类型
 */
export type StringLiteral<T extends string> = T extends string ? (string extends T ? never : T) : never;

/**
 * 数字字面量类型
 */
export type NumberLiteral<T extends number> = T extends number ? (number extends T ? never : T) : never;

/**
 * 布尔字面量类型
 */
export type BooleanLiteral<T extends boolean> = T extends boolean ? (boolean extends T ? never : T) : never;

/**
 * 精确对象类型 - 不允许额外属性
 */
export type Exact<T, Shape extends T> = Shape & {
  [K in Exclude<keyof Shape, keyof T>]: never;
};

/**
 * 可空类型
 */
export type Nullable<T> = T | null;

/**
 * 可空或 undefined 类型
 */
export type Maybe<T> = T | null | undefined;

/**
 * 非空类型
 */
export type NonNull<T> = T extends null | undefined ? never : T;

/**
 * 深度可空类型
 */
export type DeepNullable<T> = {
  [P in keyof T]: T[P] extends object ? DeepNullable<T[P]> | null : T[P] | null;
};

/**
 * 标记类型
 */
export type Tagged<T, Tag extends string> = T & { __tag: Tag };

/**
 * 不透明类型
 */
export type Opaque<T, Tag extends string> = Tagged<T, Tag>;

/**
 * 品牌类型
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * 路径类型 - 获取对象路径
 */
export type Path<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? `${Prefix}${K & string}` | Path<T[K], `${Prefix}${K & string}.`>
        : `${Prefix}${K & string}`;
    }[keyof T]
  : never;

/**
 * 路径值类型 - 根据路径获取值类型
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

/**
 * 驼峰转短横线
 */
export type CamelToKebab<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Lowercase<T> ? T : `-${Lowercase<T>}`}${CamelToKebab<U>}`
  : S;

/**
 * 短横线转驼峰
 */
export type KebabToCamel<S extends string> = S extends `${infer T}-${infer U}`
  ? `${T}${Capitalize<KebabToCamel<U>>}`
  : S;

/**
 * 大写首字母
 */
export type CapitalizeFirst<S extends string> = Capitalize<S>;

/**
 * 小写首字母
 */
export type UncapitalizeFirst<S extends string> = Uncapitalize<S>;

/**
 * 条件排除
 */
export type ExcludeConditional<T, C> = T extends C ? never : T;

/**
 * 条件提取
 */
export type ExtractConditional<T, C> = T extends C ? T : never;

/**
 * 可比较类型
 */
export type Comparable = string | number | boolean | Date | null | undefined;

/**
 * 比较结果
 */
export type CompareResult = -1 | 0 | 1;

/**
 * 比较函数
 */
export type CompareFn<T> = (a: T, b: T) => CompareResult;

/**
 * 唯一 ID 类型
 */
export type ID = string | number;

/**
 * UUID 类型
 */
export type UUID = string;

/**
 * 时间戳类型
 */
export type Timestamp = number | Date;

/**
 * 日期范围
 */
export type DateRange = {
  start: Date;
  end: Date;
};

/**
 * 数字范围
 */
export type NumberRange = {
  min: number;
  max: number;
};

/**
 * 分页结果
 */
export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

/**
 * 游标分页结果
 */
export type CursorPaginatedResult<T> = {
  data: T[];
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * 操作结果
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 成功结果
 */
export type Success<T> = {
  success: true;
  data: T;
};

/**
 * 失败结果
 */
export type Failure<E = Error> = {
  success: false;
  error: E;
};

/**
 * 创建成功结果
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * 创建失败结果
 */
export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * 命令模式类型
 */
export interface Command<T = void> {
  execute(): Promise<T>;
  undo?(): Promise<void>;
}

/**
 * 查询模式类型
 */
export interface Query<T> {
  execute(): Promise<T>;
}

/**
 * 处理器模式类型
 */
export interface Handler<TInput, TOutput> {
  handle(input: TInput): Promise<TOutput>;
}

/**
 * 策略模式类型
 */
export interface Strategy<T> {
  canHandle(context: any): boolean;
  execute(context: any): Promise<T>;
}

/**
 * 工厂模式类型
 */
export interface Factory<T> {
  create(...args: any[]): Promise<T>;
}

/**
 * 单例模式类型
 */
export interface Singleton<T> {
  getInstance(): T;
}

/**
 * 构建器模式类型
 */
export interface Builder<T> {
  build(): T;
}

/**
 * 观察者模式类型
 */
export interface Observer<T> {
  update(data: T): void;
}

/**
 * 被观察者模式类型
 */
export interface Observable<T> {
  subscribe(observer: Observer<T>): void;
  unsubscribe(observer: Observer<T>): void;
  notify(data: T): void;
}

/**
 * 装饰器模式类型
 */
export interface Decorator<T> {
  decorate(target: T): T;
}

/**
 * 适配器模式类型
 */
export interface Adapter<TTarget, TAdaptee> {
  adapt(adaptee: TAdaptee): TTarget;
}

/**
 * 外观模式类型
 */
export interface Facade<T> {
  execute(): Promise<T>;
}

/**
 * 代理模式类型
 */
export interface Proxy<T> {
  get(): T;
  set(value: T): void;
}

/**
 * 责任链模式类型
 */
export interface ChainOfResponsibility<T> {
  setNext(handler: ChainOfResponsibility<T>): ChainOfResponsibility<T>;
  handle(request: T): Promise<T>;
}

/**
 * 中间件模式类型
 */
export interface Middleware<T> {
  use(handler: (request: T, next: () => Promise<T>) => Promise<T>): void;
  execute(request: T): Promise<T>;
}
