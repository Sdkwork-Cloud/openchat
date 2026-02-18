/**
 * 观察者模式实现
 * 用于数据绑定和响应式更新
 */

export interface Observer {
  update(data: any): void;
}

export interface Observable {
  attach(observer: Observer): void;
  detach(observer: Observer): void;
  notify(data?: any): void;
}

export class Subject implements Observable {
  private observers: Observer[] = [];

  attach(observer: Observer): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  detach(observer: Observer): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notify(data?: any): void {
    for (const observer of this.observers) {
      observer.update(data);
    }
  }

  clear(): void {
    this.observers = [];
  }

  count(): number {
    return this.observers.length;
  }
}

export class ReactiveValue<T> {
  private value: T;
  private subject: Subject;

  constructor(initialValue: T) {
    this.value = initialValue;
    this.subject = new Subject();
  }

  get(): T {
    return this.value;
  }

  set(newValue: T): void {
    if (this.value !== newValue) {
      this.value = newValue;
      this.subject.notify(newValue);
    }
  }

  update(fn: (value: T) => T): void {
    const newValue = fn(this.value);
    this.set(newValue);
  }

  attach(observer: Observer): void {
    this.subject.attach(observer);
  }

  detach(observer: Observer): void {
    this.subject.detach(observer);
  }

  subscribe(fn: (value: T) => void): () => void {
    const observer: Observer = {
      update: (data) => fn(data as T),
    };
    this.subject.attach(observer);
    return () => this.subject.detach(observer);
  }
}

export function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj: T, prop: string | symbol): any {
      return (obj as any)[prop];
    },
    set(obj: T, prop: string | symbol, value: any): boolean {
      (obj as any)[prop] = value;
      return true;
    },
  });
}
