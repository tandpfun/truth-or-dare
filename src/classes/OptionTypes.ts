import type {
  APIApplicationCommandInteractionDataOptionWithValues,
  ApplicationCommandInteractionDataOptionSubCommand,
  APIApplicationCommandSubCommandOptions,
  APIApplicationCommandArgumentOptions,
  ApplicationCommandOptionType,
  APIApplicationCommandOption,
  Snowflake,
} from 'discord-api-types/v9';

export type Mutable<D> = {
  -readonly [key in keyof D]: Mutable<D[key]>;
};
export type ReadOnly<D> = {
  readonly [key in keyof D]: ReadOnly<D[key]>;
};

export type OptionType<O extends APIApplicationCommandOption> =
  O extends APIApplicationCommandSubCommandOptions
    ? SubOptionType<O>
    : O extends Exclude<APIApplicationCommandOption, APIApplicationCommandSubCommandOptions>
    ? DataOption<O>
    : never;

type SubOptionType<O extends APIApplicationCommandSubCommandOptions> = {
  name: O['name'];
  type: O['type'];
  options: O['options'] extends any[]
    ? O['type'] extends ApplicationCommandOptionType.SubcommandGroup
      ? ApplicationCommandInteractionDataOptionSubCommand[]
      : APIApplicationCommandInteractionDataOptionWithValues[]
    : [];
};

type DataOption<
  O extends Exclude<APIApplicationCommandOption, APIApplicationCommandSubCommandOptions>
> = {
  name: O['name'];
  type: O['type'];
  value: O extends APIApplicationCommandArgumentOptions
    ? O['choices'] extends any[]
      ? // @ts-ignore
        O['choices'][number]['value']
      : ValueType<O>
    : ValueType<O>;
};

type MentionableTypes =
  | ApplicationCommandOptionType.Channel
  | ApplicationCommandOptionType.Mentionable
  | ApplicationCommandOptionType.Role
  | ApplicationCommandOptionType.User;
type NumberTypes = ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number;

type ValueType<
  O extends Exclude<APIApplicationCommandOption, APIApplicationCommandSubCommandOptions>
> = O['type'] extends MentionableTypes
  ? Snowflake
  : O['type'] extends NumberTypes
  ? number
  : O['type'] extends ApplicationCommandOptionType.String
  ? string
  : O['type'] extends ApplicationCommandOptionType.Boolean
  ? boolean
  : never;
