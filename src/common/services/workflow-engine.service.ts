import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowStep<T = any> {
  id: string;
  name: string;
  type: 'task' | 'decision' | 'parallel' | 'subworkflow' | 'wait' | 'loop';
  config: T;
  next?: string | string[];
  condition?: (context: WorkflowContext) => boolean;
  retryPolicy?: {
    maxAttempts: number;
    delay: number;
    backoff?: 'fixed' | 'exponential';
  };
  timeout?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  steps: WorkflowStep[];
  initialStep: string;
  variables?: Record<string, any>;
  onError?: 'stop' | 'continue' | 'rollback';
}

export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, any>;
  input: any;
  output: any;
  history: StepExecution[];
  metadata: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  definitionId: string;
  status: WorkflowStatus;
  context: WorkflowContext;
  currentStepId?: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface StepExecution {
  stepId: string;
  stepName: string;
  status: StepStatus;
  startedAt: number;
  completedAt?: number;
  output?: any;
  error?: string;
  attempts: number;
}

export interface StepHandler<T = any> {
  (context: WorkflowContext, config: T): Promise<any>;
}

export interface WorkflowEngineOptions {
  maxConcurrentExecutions?: number;
  defaultTimeout?: number;
  persistExecutions?: boolean;
  onWorkflowComplete?: (execution: WorkflowExecution) => void;
  onWorkflowFailed?: (execution: WorkflowExecution, error: Error) => void;
  onStepComplete?: (execution: WorkflowExecution, step: StepExecution) => void;
  onStepFailed?: (execution: WorkflowExecution, step: StepExecution, error: Error) => void;
}

export interface WorkflowStats {
  totalDefinitions: number;
  totalExecutions: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
}

@Injectable()
export class WorkflowEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly executions = new Map<string, WorkflowExecution>();
  private readonly stepHandlers = new Map<string, StepHandler>();
  private readonly options: Required<WorkflowEngineOptions>;

  constructor(private readonly configService: ConfigService) {
    this.options = {
      maxConcurrentExecutions: 100,
      defaultTimeout: 300000,
      persistExecutions: true,
      onWorkflowComplete: () => {},
      onWorkflowFailed: () => {},
      onStepComplete: () => {},
      onStepFailed: () => {},
    };
  }

  onModuleInit() {
    this.logger.log('WorkflowEngineService initialized');
  }

  onModuleDestroy() {
    for (const execution of this.executions.values()) {
      if (execution.status === 'running') {
        execution.status = 'cancelled';
      }
    }
  }

  registerDefinition(definition: WorkflowDefinition): void {
    this.validateDefinition(definition);
    this.definitions.set(definition.id, definition);
    this.logger.log(`Workflow definition '${definition.id}' registered`);
  }

  unregisterDefinition(definitionId: string): boolean {
    return this.definitions.delete(definitionId);
  }

  getDefinition(definitionId: string): WorkflowDefinition | undefined {
    return this.definitions.get(definitionId);
  }

  registerStepHandler<T = any>(stepType: string, handler: StepHandler<T>): void {
    this.stepHandlers.set(stepType, handler);
    this.logger.debug(`Step handler registered for type '${stepType}'`);
  }

  async start(definitionId: string, input?: any, variables?: Record<string, any>): Promise<WorkflowExecution> {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      throw new Error(`Workflow definition '${definitionId}' not found`);
    }

    const runningCount = Array.from(this.executions.values()).filter(e => e.status === 'running').length;
    if (runningCount >= this.options.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent executions reached');
    }

    const executionId = this.generateExecutionId();
    const context: WorkflowContext = {
      workflowId: definitionId,
      executionId,
      variables: { ...definition.variables, ...variables },
      input,
      output: {},
      history: [],
      metadata: {},
    };

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: definitionId,
      definitionId,
      status: 'running',
      context,
      currentStepId: definition.initialStep,
      startedAt: Date.now(),
    };

    this.executions.set(executionId, execution);

    this.executeWorkflow(execution, definition).catch(error => {
      this.logger.error(`Workflow execution failed: ${executionId}`, error);
    });

    return execution;
  }

  async pause(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'paused';
    return true;
  }

  async resume(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'paused') {
      return false;
    }

    const definition = this.definitions.get(execution.definitionId);
    if (!definition) return false;

    execution.status = 'running';

    this.executeWorkflow(execution, definition).catch(error => {
      this.logger.error(`Workflow execution failed: ${executionId}`, error);
    });

    return true;
  }

  async cancel(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || !['running', 'paused'].includes(execution.status)) {
      return false;
    }

    execution.status = 'cancelled';
    execution.completedAt = Date.now();

    return true;
  }

  async retry(executionId: string, stepId?: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'failed') {
      return false;
    }

    const definition = this.definitions.get(execution.definitionId);
    if (!definition) return false;

    if (stepId) {
      const stepExecution = execution.context.history.find(h => h.stepId === stepId);
      if (stepExecution) {
        stepExecution.status = 'pending';
        stepExecution.error = undefined;
        execution.currentStepId = stepId;
      }
    } else {
      const failedStep = execution.context.history.find(h => h.status === 'failed');
      if (failedStep) {
        failedStep.status = 'pending';
        failedStep.error = undefined;
        execution.currentStepId = failedStep.stepId;
      }
    }

    execution.status = 'running';
    execution.error = undefined;

    this.executeWorkflow(execution, definition).catch(error => {
      this.logger.error(`Workflow retry failed: ${executionId}`, error);
    });

    return true;
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  getExecutions(workflowId?: string): WorkflowExecution[] {
    const executions = Array.from(this.executions.values());
    if (workflowId) {
      return executions.filter(e => e.workflowId === workflowId);
    }
    return executions;
  }

  getStats(): WorkflowStats {
    const executions = Array.from(this.executions.values());
    const completed = executions.filter(e => e.status === 'completed');
    const failed = executions.filter(e => e.status === 'failed');

    const avgTime = completed.length > 0
      ? completed.reduce((sum, e) => sum + ((e.completedAt || 0) - e.startedAt), 0) / completed.length
      : 0;

    return {
      totalDefinitions: this.definitions.size,
      totalExecutions: executions.length,
      runningExecutions: executions.filter(e => e.status === 'running').length,
      completedExecutions: completed.length,
      failedExecutions: failed.length,
      averageExecutionTime: avgTime,
    };
  }

  setVariable(executionId: string, key: string, value: any): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) return false;

    execution.context.variables[key] = value;
    return true;
  }

  getVariable(executionId: string, key: string): any {
    const execution = this.executions.get(executionId);
    if (!execution) return undefined;

    return execution.context.variables[key];
  }

  private async executeWorkflow(execution: WorkflowExecution, definition: WorkflowDefinition): Promise<void> {
    while (execution.status === 'running' && execution.currentStepId) {
      const step = definition.steps.find(s => s.id === execution.currentStepId);
      if (!step) {
        execution.status = 'failed';
        execution.error = `Step '${execution.currentStepId}' not found`;
        execution.completedAt = Date.now();
        this.options.onWorkflowFailed(execution, new Error(execution.error));
        return;
      }

      try {
        await this.executeStep(execution, step, definition);

        if (execution.status !== 'running') break;

        const nextStepId = this.getNextStep(execution, step);
        if (!nextStepId) {
          execution.status = 'completed';
          execution.completedAt = Date.now();
          this.options.onWorkflowComplete(execution);
          this.logger.log(`Workflow '${execution.id}' completed`);
        } else {
          execution.currentStepId = nextStepId;
        }
      } catch (error: any) {
        execution.status = 'failed';
        execution.error = error.message;
        execution.completedAt = Date.now();
        this.options.onWorkflowFailed(execution, error);
        this.logger.error(`Workflow '${execution.id}' failed at step '${step.id}': ${error.message}`);
      }
    }
  }

  private async executeStep(execution: WorkflowExecution, step: WorkflowStep, definition: WorkflowDefinition): Promise<void> {
    const stepExecution: StepExecution = {
      stepId: step.id,
      stepName: step.name,
      status: 'running',
      startedAt: Date.now(),
      attempts: 0,
    };

    execution.context.history.push(stepExecution);

    const maxAttempts = step.retryPolicy?.maxAttempts || 1;
    const delay = step.retryPolicy?.delay || 1000;
    const backoff = step.retryPolicy?.backoff || 'fixed';

    while (stepExecution.attempts < maxAttempts) {
      stepExecution.attempts++;

      try {
        const handler = this.stepHandlers.get(step.type);
        if (!handler) {
          throw new Error(`No handler for step type '${step.type}'`);
        }

        const timeout = step.timeout || this.options.defaultTimeout;
        const result = await this.withTimeout(
          handler(execution.context, step.config),
          timeout,
        );

        stepExecution.status = 'completed';
        stepExecution.completedAt = Date.now();
        stepExecution.output = result;

        execution.context.output[step.id] = result;

        this.options.onStepComplete(execution, stepExecution);

        return;
      } catch (error: any) {
        stepExecution.error = error.message;

        if (stepExecution.attempts < maxAttempts) {
          const waitTime = backoff === 'exponential'
            ? delay * Math.pow(2, stepExecution.attempts - 1)
            : delay;

          await this.sleep(waitTime);
        } else {
          stepExecution.status = 'failed';
          stepExecution.completedAt = Date.now();

          this.options.onStepFailed(execution, stepExecution, error);

          throw error;
        }
      }
    }
  }

  private getNextStep(execution: WorkflowExecution, step: WorkflowStep): string | undefined {
    if (!step.next) return undefined;

    if (typeof step.next === 'string') {
      return step.next;
    }

    if (step.condition) {
      const matchingIndex = step.next.findIndex((_, index) => {
        return step.condition!(execution.context);
      });
      return matchingIndex >= 0 ? step.next[matchingIndex] : step.next[0];
    }

    return step.next[0];
  }

  private validateDefinition(definition: WorkflowDefinition): void {
    if (!definition.id) {
      throw new Error('Workflow definition must have an id');
    }

    if (!definition.steps || definition.steps.length === 0) {
      throw new Error('Workflow definition must have at least one step');
    }

    if (!definition.initialStep) {
      throw new Error('Workflow definition must have an initial step');
    }

    const initialStep = definition.steps.find(s => s.id === definition.initialStep);
    if (!initialStep) {
      throw new Error(`Initial step '${definition.initialStep}' not found in steps`);
    }

    const stepIds = new Set(definition.steps.map(s => s.id));
    for (const step of definition.steps) {
      if (step.next) {
        const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
        for (const nextId of nextSteps) {
          if (!stepIds.has(nextId)) {
            throw new Error(`Step '${step.id}' references unknown next step '${nextId}'`);
          }
        }
      }
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Step timeout')), timeout);
      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
