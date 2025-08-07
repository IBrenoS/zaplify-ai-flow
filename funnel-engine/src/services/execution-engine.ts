import config from '@/config';
import {
  ActionResult,
  ExecutionContext,
  ExecutionError,
  ExecutionLog,
  ExecutionStatus,
  FlowExecution,
  Funnel,
  FunnelNode,
  LogLevel
} from '@/types';
import { Logger } from '@/utils/logger';
import { CacheService } from './cache-service';
import { MetricsService } from './metrics-service';
import { NodeExecutorFactory } from './node-executor-factory';
import { QueueService } from './queue-service';

export class ExecutionEngine {
  private nodeExecutorFactory: NodeExecutorFactory;
  private queueService: QueueService;
  private cacheService: CacheService;
  private metricsService: MetricsService;
  private logger: Logger;
  private activeExecutions: Map<string, FlowExecution>;

  constructor(
    nodeExecutorFactory: NodeExecutorFactory,
    queueService: QueueService,
    cacheService: CacheService,
    metricsService: MetricsService,
    logger: Logger
  ) {
    this.nodeExecutorFactory = nodeExecutorFactory;
    this.queueService = queueService;
    this.cacheService = cacheService;
    this.metricsService = metricsService;
    this.logger = logger;
    this.activeExecutions = new Map();
  }

  async executeFunnel(
    funnel: Funnel,
    triggerId?: string,
    initialVariables: Record<string, unknown> = {}
  ): Promise<ExecutionContext> {
    const executionId = this.generateExecutionId();

    // Create execution context
    const context: ExecutionContext = {
      id: executionId,
      funnelId: funnel.id,
      triggerId,
      status: ExecutionStatus.PENDING,
      startTime: new Date(),
      variables: { ...initialVariables },
      logs: [],
      errors: [],
      metadata: {
        executionSource: triggerId ? 'trigger' : 'manual',
        priority: 'normal',
        tags: funnel.metadata.tags
      }
    };

    try {
      // Update status to running
      context.status = ExecutionStatus.RUNNING;
      await this.saveExecutionContext(context);

      // Log execution start
      this.addLog(context, LogLevel.INFO, undefined, 'Funnel execution started', {
        funnelId: funnel.id,
        funnelName: funnel.name,
        triggerId
      });

      // Find entry node (trigger node)
      const entryNode = this.findEntryNode(funnel);
      if (!entryNode) {
        throw new Error('No entry node found in funnel');
      }

      // Start execution from entry node
      await this.executeFromNode(funnel, entryNode, context);

      // Mark as completed if still running
      if (context.status === ExecutionStatus.RUNNING) {
        context.status = ExecutionStatus.COMPLETED;
        context.endTime = new Date();
      }

      this.addLog(context, LogLevel.INFO, undefined, 'Funnel execution completed');

      // Update metrics
      await this.metricsService.recordExecution(context);

    } catch (error) {
      context.status = ExecutionStatus.FAILED;
      context.endTime = new Date();

      this.addError(context, undefined, error instanceof Error ? error.message : 'Unknown error', error);
      this.addLog(context, LogLevel.ERROR, undefined, 'Funnel execution failed', { error: error.message });

      await this.metricsService.recordExecutionError(context, error);
    } finally {
      await this.saveExecutionContext(context);
      this.activeExecutions.delete(executionId);
    }

    return context;
  }

  private async executeFromNode(
    funnel: Funnel,
    node: FunnelNode,
    context: ExecutionContext
  ): Promise<void> {
    if (context.status !== ExecutionStatus.RUNNING) {
      return; // Execution was cancelled or failed
    }

    try {
      context.currentNodeId = node.id;

      this.addLog(context, LogLevel.INFO, node.id, `Executing node: ${node.name}`, {
        nodeType: node.type,
        nodeConfig: node.config
      });

      // Get node executor
      const executor = this.nodeExecutorFactory.getExecutor(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // Execute node
      const result: ActionResult = await executor.execute(node, context);

      // Update variables if provided
      if (result.variables) {
        context.variables = { ...context.variables, ...result.variables };
      }

      this.addLog(context, LogLevel.INFO, node.id, 'Node execution completed', {
        success: result.success,
        shouldContinue: result.shouldContinue
      });

      // Handle execution result
      if (!result.success) {
        throw new Error(result.error || 'Node execution failed');
      }

      if (!result.shouldContinue) {
        context.status = ExecutionStatus.COMPLETED;
        return;
      }

      // Find next node(s) to execute
      const nextNodes = this.findNextNodes(funnel, node, context, result);

      // Execute next nodes
      for (const nextNode of nextNodes) {
        await this.executeFromNode(funnel, nextNode, context);

        // Break if execution was stopped
        if (context.status !== ExecutionStatus.RUNNING) {
          break;
        }
      }

    } catch (error) {
      this.addError(context, node.id, error instanceof Error ? error.message : 'Unknown error', error);

      // Check if we should retry
      const shouldRetry = await this.shouldRetryExecution(context, node, error);
      if (shouldRetry) {
        this.addLog(context, LogLevel.WARN, node.id, 'Retrying node execution');
        await this.delay(config.RETRY_DELAY);
        await this.executeFromNode(funnel, node, context);
      } else {
        throw error; // Re-throw to fail the execution
      }
    }
  }

  private findEntryNode(funnel: Funnel): FunnelNode | null {
    // Look for trigger nodes or nodes with no incoming connections
    const entryNode = funnel.nodes.find(node =>
      node.type === 'trigger' ||
      !funnel.nodes.some(n => n.connections.some(c => c.targetNodeId === node.id))
    );

    return entryNode || null;
  }

  private findNextNodes(
    funnel: Funnel,
    currentNode: FunnelNode,
    context: ExecutionContext,
    result: ActionResult
  ): FunnelNode[] {
    // If result specifies next node, use that
    if (result.nextNodeId) {
      const nextNode = funnel.nodes.find(n => n.id === result.nextNodeId);
      return nextNode ? [nextNode] : [];
    }

    // Find connected nodes
    const nextNodes: FunnelNode[] = [];

    for (const connection of currentNode.connections) {
      // Check if connection condition is met (if any)
      if (connection.condition) {
        const conditionMet = this.evaluateCondition(connection.condition, context);
        if (!conditionMet) {
          continue;
        }
      }

      const targetNode = funnel.nodes.find(n => n.id === connection.targetNodeId);
      if (targetNode) {
        nextNodes.push(targetNode);
      }
    }

    return nextNodes;
  }

  private evaluateCondition(condition: any, context: ExecutionContext): boolean {
    // Simplified condition evaluation - implement full logic based on your needs
    try {
      const { field, operator, value } = condition;
      const actualValue = this.getVariableValue(field, context);

      switch (operator) {
        case 'equals':
          return actualValue === value;
        case 'not_equals':
          return actualValue !== value;
        case 'greater_than':
          return Number(actualValue) > Number(value);
        case 'less_than':
          return Number(actualValue) < Number(value);
        case 'contains':
          return String(actualValue).includes(String(value));
        case 'exists':
          return actualValue !== undefined && actualValue !== null;
        default:
          this.logger.warn(`Unknown condition operator: ${operator}`);
          return false;
      }
    } catch (error) {
      this.logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  private getVariableValue(field: string, context: ExecutionContext): unknown {
    // Support dot notation for nested variables
    const parts = field.split('.');
    let value: unknown = context.variables;

    for (const part of parts) {
      if (typeof value === 'object' && value !== null && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private async shouldRetryExecution(
    context: ExecutionContext,
    node: FunnelNode,
    error: unknown
  ): Promise<boolean> {
    const errorCount = context.errors.filter(e => e.nodeId === node.id).length;
    return errorCount < config.MAX_RETRY_ATTEMPTS;
  }

  private addLog(
    context: ExecutionContext,
    level: LogLevel,
    nodeId: string | undefined,
    message: string,
    data?: unknown
  ): void {
    const log: ExecutionLog = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      nodeId,
      message,
      data
    };

    context.logs.push(log);
    this.logger.log(level, message, { executionId: context.id, nodeId, data });
  }

  private addError(
    context: ExecutionContext,
    nodeId: string | undefined,
    message: string,
    error: unknown
  ): void {
    const executionError: ExecutionError = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      nodeId,
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      data: error,
      isRetryable: true
    };

    context.errors.push(executionError);
  }

  private async saveExecutionContext(context: ExecutionContext): Promise<void> {
    try {
      await this.cacheService.set(`execution:${context.id}`, context, 3600); // 1 hour TTL
    } catch (error) {
      this.logger.error('Failed to save execution context:', error);
    }
  }

  async getExecutionContext(executionId: string): Promise<ExecutionContext | null> {
    try {
      return await this.cacheService.get(`execution:${executionId}`);
    } catch (error) {
      this.logger.error('Failed to get execution context:', error);
      return null;
    }
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    try {
      const context = await this.getExecutionContext(executionId);
      if (context && context.status === ExecutionStatus.RUNNING) {
        context.status = ExecutionStatus.CANCELLED;
        context.endTime = new Date();
        await this.saveExecutionContext(context);
        this.activeExecutions.delete(executionId);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to cancel execution:', error);
      return false;
    }
  }

  getActiveExecutions(): FlowExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
