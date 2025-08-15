import express from 'express';

import { logger } from '../utils/index.js';

export function createBodyParserMiddleware() {
  const bodyLimit = '1mb';

  logger.info('Body parser middleware configured', 'system', 'startup', {
    jsonLimit: bodyLimit,
    urlencodedLimit: bodyLimit
  });

  return [
    express.json({
      limit: bodyLimit,
      strict: true,
      type: 'application/json'
    }),
    express.urlencoded({
      extended: true,
      limit: bodyLimit,
      parameterLimit: 1000
    })
  ];
}
