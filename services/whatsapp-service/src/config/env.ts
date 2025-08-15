import { z } from 'zod';

const envSchema = z.object({
  // Básicas obrigatórias
  PORT: z.string().transform(Number).default('8081'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Evolution API - obrigatórias
  EVOLUTION_BASE_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_SESSION_ID: z.string().default('1'),

  // Dados - obrigatórias
  MONGODB_URI: z.string().url(),

  // Opcionais
  REDIS_URL: z.string().optional(),

  // Webhook - opcionais
  EVOLUTION_WEBHOOK_SECRET: z.string().optional(),

  // Kafka - opcionais
  ENABLE_KAFKA: z.string().transform(val => val === 'true').default('false'),
  KAFKA_BROKERS: z.string().optional(),
  KAFKA_CLIENT_ID: z.string().default('whatsapp-service'),

  // Media & S3 - opcionais
  USE_S3: z.string().transform(val => val === 'true').default('false'),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  MEDIA_UPLOAD_PATH: z.string().default('/app/uploads'),
});

export type AppConfig = z.infer<typeof envSchema>;

function validateConfig(): AppConfig {
  try {
    const config = envSchema.parse(process.env);
    return config;
  } catch (error) {
    // Durante testes, não fazer log nem exit
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      throw error;
    }

    console.error('❌ Erro na validação de configuração:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(`  - ${error}`);
    }

    console.error('\n📋 Variáveis obrigatórias:');
    console.error('  - EVOLUTION_BASE_URL (URL da Evolution API)');
    console.error('  - EVOLUTION_API_KEY (Token de autenticação)');
    console.error('  - EVOLUTION_SESSION_ID (ID da sessão)');
    console.error('  - MONGODB_URI (String de conexão MongoDB)');

    process.exit(1);
  }
}

// Para testes, retornar um config mock se a validação falhar
let config: AppConfig;
try {
  config = validateConfig();
} catch (error) {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    // Config mock para testes
    config = {
      PORT: 8081,
      NODE_ENV: 'test' as const,
      EVOLUTION_BASE_URL: 'http://localhost:3000',
      EVOLUTION_API_KEY: 'test-key',
      EVOLUTION_SESSION_ID: 'test-session',
      MONGODB_URI: 'mongodb://localhost:27017/test',
      REDIS_URL: undefined,
      EVOLUTION_WEBHOOK_SECRET: undefined,
      ENABLE_KAFKA: false,
      KAFKA_BROKERS: undefined,
      KAFKA_CLIENT_ID: 'whatsapp-service',
      USE_S3: false,
      AWS_REGION: undefined,
      AWS_S3_BUCKET: undefined,
      AWS_ACCESS_KEY_ID: undefined,
      AWS_SECRET_ACCESS_KEY: undefined,
      MEDIA_UPLOAD_PATH: '/tmp/uploads',
    };
  } else {
    throw error;
  }
}

export { config };
