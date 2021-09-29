"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const discord_interactions_1 = require("discord-interactions");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const Context_1 = __importDefault(require("./Context"));
class Server {
    constructor(port, client) {
        this.port = port;
        this.client = client;
        this.router = (0, express_1.default)();
        this.router.use('/api/questions/', (0, express_rate_limit_1.default)({
            windowMs: 10 * 1000,
            max: 5,
            skipFailedRequests: true,
            handler: (_, res) => {
                res
                    .send({
                    error: true,
                    message: 'Too many requests, please try again later.',
                })
                    .status(429);
            },
        }));
        this.router.post('/interactions', (0, discord_interactions_1.verifyKeyMiddleware)(this.client.publicKey), (req, res) => this.handleRequest(req, res));
        this.router.get('/api/questions/:questionType', (req, res) => {
            const questionType = req.params.questionType;
            const rating = req.query.rating;
            if (!['dare', 'truth', 'nhie', 'wyr'].includes(questionType))
                return res
                    .send({
                    error: true,
                    message: 'The question type must be one of the following: "dare" "truth" "nhie" "wyr"',
                })
                    .status(400);
            if (!rating)
                return res.send(this.client.randomQuestion(questionType));
            if (!['pg', 'pg13', 'r'].includes(rating))
                return res
                    .send({
                    error: true,
                    message: 'The rating must be one of the following: "pg" "pg13" "r"',
                })
                    .status(400);
            res.send(this.client.randomQuestion(questionType, [
                rating,
            ]));
        });
    }
    start() {
        this.router.listen(this.port, () => this.client.console.success(`Listening for requests on port ${this.port}!`));
    }
    async handleRequest(req, res) {
        const interaction = req.body;
        if (interaction.type === discord_interactions_1.InteractionType.APPLICATION_COMMAND) {
            const ctx = new Context_1.default(interaction, this.client, res);
            await this.handleCommand(ctx);
        }
    }
    async handleCommand(ctx) {
        const command = this.client.commands.find(c => c.name === ctx.command.name);
        if (!command)
            return this.client.console.error(`Command ${ctx.command.name} was run with no corresponding command file.`);
        if (!this.client.functions.checkPerms(command, ctx))
            return;
        await command.run(ctx);
        this.client.console.log(`${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) ran the ${command.name} command.`);
    }
}
exports.default = Server;
