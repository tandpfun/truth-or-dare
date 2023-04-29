import {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
} from 'discord-api-types/v9';

export type APIChatInputApplicationCommandInteractionWithEntitlements =
  APIChatInputApplicationCommandInteraction & { entitlement_sku_ids?: string[] };

export type APIMessageComponentInteractionWithEntitlements = APIMessageComponentInteraction & {
  entitlement_sku_ids?: string[];
};

export type APIModalSubmitInteractionWithEntitlements = APIModalSubmitInteraction & {
  entitlement_sku_ids?: string[];
};

export type APIApplicationEntitlement = {
  id: string;
  sku_id: string;
  application_id: string;
  user_id: string;
  promotion_id?: string;
  type: number;
  deleted: boolean;
  gift_code_flags: number;
  consumed: boolean;
  starts_at: string;
  ends_at: string;
  guild_id: string;
  subscription_id: string;
};

export type RESTGetAPIApplicationEntitlementsResult = APIApplicationEntitlement[];
