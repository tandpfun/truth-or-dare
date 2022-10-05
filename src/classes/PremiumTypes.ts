import {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v9';

export type APIChatInputApplicationCommandInteractionWithEntitlements =
  APIChatInputApplicationCommandInteraction & { entitlement_sku_ids?: string[] };

export type APIMessageComponentInteractionWithEntitlements = APIMessageComponentInteraction & {
  entitlement_sku_ids?: string[];
};
