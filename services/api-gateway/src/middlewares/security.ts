import helmet from 'helmet';

import { config, configHelpers } from '../config/env.js';
import { logger } from '../utils/index.js';

export function createSecurityMiddleware() {
  const isDevelopment = configHelpers.isDevelopment();

  const helmetOptions = {
    // Headers básicos de segurança
    contentSecurityPolicy: (isDevelopment || !config.security.SECURITY_CSP_ENABLED) ? false : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' as const },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' as const },
    crossOriginEmbedderPolicy: false, // Pode quebrar integrações
    dnsPrefetchControl: { allow: false },
    frameguard: config.security.SECURITY_FRAME_GUARD_ENABLED ? { action: 'deny' as const } : false,
    hidePoweredBy: true,
    hsts: (isDevelopment || !config.security.SECURITY_HSTS_ENABLED) ? false : {
      maxAge: 31536000, // 1 ano
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
    xssFilter: true
  };

  logger.info('Security middleware configured', 'system', 'startup', {
    isDevelopment,
    cspDisabled: !config.security.SECURITY_CSP_ENABLED,
    hstsDisabled: !config.security.SECURITY_HSTS_ENABLED,
    frameGuardEnabled: config.security.SECURITY_FRAME_GUARD_ENABLED,
    trustProxy: config.security.TRUST_PROXY,
    allowedHosts: config.security.ALLOWED_HOSTS.length
  });

  return helmet(helmetOptions);
}
