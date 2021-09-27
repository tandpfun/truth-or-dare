export default class Command {
  constructor(name, client, options) {
    this.name = name;
    this.client = client;
    this.description = options.description || '';
    this.options = options.options || [];
    this.perms = options.perms || [];
  }

  async run() {
    throw new Error(
      `The ${this.name} command has not implemented a run method.`
    );
  }

  async validate(interaction) {}
}
