import { ActionResult, ExecutionContext, FunnelNode, NodeConfig, NodeExecutor, NodeType, ValidationResult } from '@/types';

export class EndExecutor implements NodeExecutor {
  type: NodeType = NodeType.END;

  async execute(node: FunnelNode, context: ExecutionContext): Promise<ActionResult> {
    try {
      const { message, saveData } = node.config as {
        message?: string;
        saveData?: Record<string, unknown>;
      };

      // Save any final data to context variables
      if (saveData) {
        context.variables = { ...context.variables, ...saveData };
      }

      return {
        success: true,
        shouldContinue: false, // End execution
        data: {
          message: message || 'Flow execution completed',
          finalVariables: context.variables
        },
        metadata: {
          executionTime: Date.now(),
          retryCount: 0,
          timestamp: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldContinue: false,
        metadata: {
          executionTime: Date.now(),
          retryCount: 0,
          timestamp: new Date()
        }
      };
    }
  }

  validate(config: NodeConfig): ValidationResult {
    // End nodes don't require specific validation
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }
}
