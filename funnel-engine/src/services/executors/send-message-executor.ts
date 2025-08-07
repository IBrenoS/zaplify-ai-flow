import config from '@/config';
import { ActionResult, ExecutionContext, FunnelNode, NodeConfig, NodeExecutor, ValidationResult } from '@/types';
import axios from 'axios';

export class SendMessageExecutor implements NodeExecutor {
  type = 'send_message' as const;

  async execute(node: FunnelNode, context: ExecutionContext): Promise<ActionResult> {
    try {
      const { message, channel, recipient, template } = node.config as {
        message?: string;
        channel: 'whatsapp' | 'email' | 'sms';
        recipient: string;
        template?: string;
      };

      // Replace variables in message
      const processedMessage = this.replaceVariables(message || template || '', context.variables);
      const processedRecipient = this.replaceVariables(recipient, context.variables);

      // Send message based on channel
      let result: boolean;
      switch (channel) {
        case 'whatsapp':
          result = await this.sendWhatsAppMessage(processedRecipient, processedMessage);
          break;
        case 'email':
          result = await this.sendEmailMessage(processedRecipient, processedMessage);
          break;
        case 'sms':
          result = await this.sendSMSMessage(processedRecipient, processedMessage);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      return {
        success: result,
        shouldContinue: true,
        data: { message: processedMessage, recipient: processedRecipient, channel },
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
    const errors: string[] = [];
    const warnings: string[] = [];

    const typedConfig = config as {
      message?: string;
      channel?: string;
      recipient?: string;
      template?: string;
    };

    if (!typedConfig.channel) {
      errors.push('Channel is required');
    } else if (!['whatsapp', 'email', 'sms'].includes(typedConfig.channel)) {
      errors.push('Channel must be whatsapp, email, or sms');
    }

    if (!typedConfig.recipient) {
      errors.push('Recipient is required');
    }

    if (!typedConfig.message && !typedConfig.template) {
      errors.push('Either message or template is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private replaceVariables(text: string, variables: Record<string, unknown>): string {
    return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' && key in current
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj);
  }

  private async sendWhatsAppMessage(recipient: string, message: string): Promise<boolean> {
    try {
      const response = await axios.post(`${config.WHATSAPP_SERVICE_URL}/send-message`, {
        to: recipient,
        message: message
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.API_KEY}`
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }

  private async sendEmailMessage(recipient: string, message: string): Promise<boolean> {
    try {
      // This would integrate with an email service
      // For now, just simulate success
      console.log(`Sending email to ${recipient}: ${message}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  private async sendSMSMessage(recipient: string, message: string): Promise<boolean> {
    try {
      // This would integrate with an SMS service
      // For now, just simulate success
      console.log(`Sending SMS to ${recipient}: ${message}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }
}
