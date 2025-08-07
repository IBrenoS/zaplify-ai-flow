export interface FunnelNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position: Position;
  config: NodeConfig;
  connections: Connection[];
  metadata?: NodeMetadata;
}

export interface Position {
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: Condition;
  label?: string;
  metadata?: ConnectionMetadata;
}

export interface NodeConfig {
  [key: string]: any;
}

export interface NodeMetadata {
  created_at: string;
  updated_at: string;
  created_by: string;
  version: number;
  tags?: string[];
}

export interface ConnectionMetadata {
  created_at: string;
  weight?: number;
  priority?: number;
}

export enum NodeType {
  // Entry points
  TRIGGER = 'trigger',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',

  // Actions
  SEND_MESSAGE = 'send_message',
  SEND_EMAIL = 'send_email',
  SEND_WHATSAPP = 'send_whatsapp',
  AI_RESPONSE = 'ai_response',

  // Data operations
  UPDATE_CONTACT = 'update_contact',
  CREATE_TASK = 'create_task',
  LOG_EVENT = 'log_event',

  // Flow control
  CONDITION = 'condition',
  DELAY = 'delay',
  WAIT = 'wait',
  BRANCH = 'branch',
  MERGE = 'merge',

  // Integrations
  API_CALL = 'api_call',
  WEBHOOK_CALL = 'webhook_call',
  DATABASE_QUERY = 'database_query',

  // Analytics
  TRACK_EVENT = 'track_event',
  UPDATE_METRICS = 'update_metrics',

  // End points
  END = 'end',
  EXIT = 'exit'
}

export enum TriggerType {
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  EVENT = 'event',
  CONDITION_MET = 'condition_met',
  USER_ACTION = 'user_action',
  TIME_BASED = 'time_based'
}

export interface Trigger {
  id: string;
  type: TriggerType;
  name: string;
  description?: string;
  config: TriggerConfig;
  funnelId: string;
  isActive: boolean;
  metadata?: TriggerMetadata;
}

export interface TriggerConfig {
  [key: string]: any;
}

export interface TriggerMetadata {
  created_at: string;
  updated_at: string;
  last_triggered?: string;
  trigger_count: number;
}

export interface Condition {
  id: string;
  type: ConditionType;
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: LogicalOperator;
  children?: Condition[];
}

export enum ConditionType {
  SIMPLE = 'simple',
  COMPLEX = 'complex',
  EXPRESSION = 'expression'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IN = 'in',
  NOT_IN = 'not_in',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  nodes: FunnelNode[];
  triggers: Trigger[];
  variables: FunnelVariable[];
  settings: FunnelSettings;
  metadata: FunnelMetadata;
}

export interface FunnelVariable {
  id: string;
  name: string;
  type: VariableType;
  defaultValue?: any;
  description?: string;
  isRequired: boolean;
}

export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  OBJECT = 'object',
  ARRAY = 'array'
}

export interface FunnelSettings {
  maxExecutionTime: number;
  maxRetryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  enableMetrics: boolean;
  allowParallelExecution: boolean;
}

export interface FunnelMetadata {
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  tags: string[];
  category?: string;
  execution_count: number;
  success_rate: number;
}

export interface ExecutionContext {
  id: string;
  funnelId: string;
  triggerId?: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  currentNodeId?: string;
  variables: Record<string, any>;
  logs: ExecutionLog[];
  errors: ExecutionError[];
  metadata: ExecutionMetadata;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  nodeId?: string;
  message: string;
  data?: any;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface ExecutionError {
  id: string;
  timestamp: Date;
  nodeId?: string;
  error: string;
  stack?: string;
  data?: any;
  isRetryable: boolean;
}

export interface ExecutionMetadata {
  triggeredBy?: string;
  executionSource: ExecutionSource;
  priority: ExecutionPriority;
  tags?: string[];
  parentExecutionId?: string;
  childExecutionIds?: string[];
}

export enum ExecutionSource {
  MANUAL = 'manual',
  TRIGGER = 'trigger',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  API = 'api',
  RETRY = 'retry'
}

export enum ExecutionPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  nextNodeId?: string;
  shouldContinue: boolean;
  variables?: Record<string, any>;
  metadata?: ActionMetadata;
}

export interface ActionMetadata {
  executionTime: number;
  retryCount: number;
  timestamp: Date;
}

export interface FlowExecution {
  executionId: string;
  funnelId: string;
  currentNode: FunnelNode;
  context: ExecutionContext;
  variables: Record<string, any>;
}

export interface QueueJob {
  id: string;
  type: JobType;
  priority: ExecutionPriority;
  data: any;
  options: QueueJobOptions;
}

export enum JobType {
  EXECUTE_FUNNEL = 'execute_funnel',
  EXECUTE_NODE = 'execute_node',
  TRIGGER_WEBHOOK = 'trigger_webhook',
  SEND_MESSAGE = 'send_message',
  PROCESS_DELAY = 'process_delay',
  RETRY_FAILED = 'retry_failed',
  CLEANUP_EXECUTION = 'cleanup_execution'
}

export interface QueueJobOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: number;
  removeOnFail?: number;
}

export interface WebhookPayload {
  id: string;
  event: string;
  data: any;
  timestamp: Date;
  source: string;
  headers: Record<string, string>;
}

export interface ScheduleConfig {
  type: 'cron' | 'interval';
  expression: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  maxExecutions?: number;
}

export interface NodeExecutor {
  type: NodeType;
  execute(node: FunnelNode, context: ExecutionContext): Promise<ActionResult>;
  validate(config: NodeConfig): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FunnelEngineConfig {
  maxConcurrentExecutions: number;
  executionTimeout: number;
  maxRetryAttempts: number;
  retryDelay: number;
  triggerCheckInterval: number;
  webhookTimeout: number;
  webhookRetryAttempts: number;
  maxFlowNodes: number;
  maxFlowDepth: number;
  flowCacheTTL: number;
}
