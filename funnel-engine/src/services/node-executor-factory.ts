import { NodeExecutor, NodeType } from '@/types';
import { AIResponseExecutor } from './executors/ai-response-executor';
import { ConditionExecutor } from './executors/condition-executor';
import { DelayExecutor } from './executors/delay-executor';
import { EndExecutor } from './executors/end-executor';
import { SendMessageExecutor } from './executors/send-message-executor';
import { TrackEventExecutor } from './executors/track-event-executor';
import { UpdateContactExecutor } from './executors/update-contact-executor';
import { WebhookExecutor } from './executors/webhook-executor';

export class NodeExecutorFactory {
  private executors: Map<NodeType, NodeExecutor>;

  constructor() {
    this.executors = new Map();
    this.registerExecutors();
  }

  private registerExecutors(): void {
    // Message executors
    this.executors.set(NodeType.SEND_MESSAGE, new SendMessageExecutor());
    this.executors.set(NodeType.SEND_WHATSAPP, new SendMessageExecutor());
    this.executors.set(NodeType.SEND_EMAIL, new SendMessageExecutor());

    // AI executor
    this.executors.set(NodeType.AI_RESPONSE, new AIResponseExecutor());

    // Flow control executors
    this.executors.set(NodeType.CONDITION, new ConditionExecutor());
    this.executors.set(NodeType.DELAY, new DelayExecutor());

    // Integration executors
    this.executors.set(NodeType.WEBHOOK_CALL, new WebhookExecutor());
    this.executors.set(NodeType.API_CALL, new WebhookExecutor());

    // Data executors
    this.executors.set(NodeType.UPDATE_CONTACT, new UpdateContactExecutor());
    this.executors.set(NodeType.TRACK_EVENT, new TrackEventExecutor());

    // End executors
    this.executors.set(NodeType.END, new EndExecutor());
    this.executors.set(NodeType.EXIT, new EndExecutor());
  }

  getExecutor(nodeType: NodeType): NodeExecutor | undefined {
    return this.executors.get(nodeType);
  }

  registerExecutor(nodeType: NodeType, executor: NodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  getSupportedNodeTypes(): NodeType[] {
    return Array.from(this.executors.keys());
  }
}
