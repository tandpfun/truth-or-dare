"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
class Database {
    constructor(client) {
        this.client = client;
        this.db = new client_1.PrismaClient();
    }
    async start() {
        await this.db.$connect();
        this.client.console.success('Connected to database!');
        await this.db.channelSettings.deleteMany();
    }
}
exports.default = Database;
