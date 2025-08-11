// Common validation schemas using Joi
import Joi from 'joi';

export const userSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('admin', 'user', 'agent').default('user'),
  status: Joi.string().valid('active', 'inactive', 'pending').default('pending')
});

export const messageSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  fromId: Joi.string().uuid().required(),
  toId: Joi.string().uuid().required(),
  content: Joi.string().required(),
  type: Joi.string().valid('text', 'image', 'audio', 'video', 'document').default('text'),
  metadata: Joi.object().optional()
});

export const funnelSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
  steps: Joi.array().items(Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    type: Joi.string().valid('message', 'condition', 'action', 'delay', 'webhook').required(),
    config: Joi.object().required(),
    nextSteps: Joi.array().items(Joi.string().uuid()),
    position: Joi.object({
      x: Joi.number().required(),
      y: Joi.number().required()
    }).required()
  })),
  triggers: Joi.array().items(Joi.string()),
  status: Joi.string().valid('active', 'inactive', 'draft').default('draft')
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().optional(),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

// Validation helper functions
export const validateRequest = (schema: Joi.ObjectSchema, data: any) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
  }
  return value;
};
