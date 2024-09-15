export interface BotConfig {
  global: GlobalConfig;
  instances: Record<string, InstanceConfig>;
}

interface GlobalConfig {
  port: number;
  discordApiUrl?: string;
  sentryDSN?: string;
}

interface InstanceConfig extends Partial<GlobalConfig> {
  applicationId: string;
  token: string;
  publicKey: string;
  enableR: boolean;
  premiumSku?: string;
}
