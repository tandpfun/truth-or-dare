import Logger from './classes/Logger';
import { BotConfig, GlobalConfig, InstanceConfig } from './types/config';

// Set bot configuration options here
const configuration: BotConfig = {
  global: {
    port: Number(process.env.PORT || 3000),
    discordApiUrl: process.env.DISCORD_API_URL,
    sentryDSN: process.env.SENTRY_DSN,
  },
  instances: {
    main: {
      applicationId: process.env.APPLICATION_ID!,
      token: process.env.TOKEN!,
      publicKey: process.env.PUBLIC_KEY!,
      premiumSku: process.env.PREMIUM_SKU,
      enableR: false,
    },
    ...(process.env.R_TOKEN != null && {
      r: {
        applicationId: process.env.R_APPLICATION_ID!,
        token: process.env.R_TOKEN!,
        publicKey: process.env.R_PUBLIC_KEY!,
        enableR: true,
      },
    }),
  },
};

// Functions to handle use of the config above
const logger = new Logger('Config');

export function getGlobalConfig(): GlobalConfig {
  return configuration.global;
}

export function getConfig(instance: string): InstanceConfig {
  const instanceConfig = configuration.instances[instance];
  if (instanceConfig == null) {
    throw new Error('No configuration exists for requested instance.');
  }

  const combinedConfig = { ...configuration.global, ...instanceConfig };

  // Detect missing configuration options
  const missingConfig = [];
  for (const [key, value] of Object.entries(combinedConfig)) {
    if (value == null) {
      missingConfig.push(key);
    }
  }
  if (missingConfig.length !== 0) {
    logger.warn('Missing configuration for:', missingConfig.join(', '));
  }

  return combinedConfig;
}

export function getInstances() {
  return Object.keys(configuration.instances);
}

export default configuration;
