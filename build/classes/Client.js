"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const Logger_js_1 = __importDefault(require("./Logger.js"));
const Server_js_1 = __importDefault(require("./Server.js"));
const functions = __importStar(require("./Functions.js"));
const dare_json_1 = __importDefault(require("../questions/dare.json"));
const nhie_json_1 = __importDefault(require("../questions/nhie.json"));
const truth_json_1 = __importDefault(require("../questions/truth.json"));
const wyr_json_1 = __importDefault(require("../questions/wyr.json"));
const superagent_1 = __importDefault(require("superagent"));
const Database_js_1 = __importDefault(require("./Database.js"));
class Client {
    constructor({ token, applicationId, publicKey, port, }) {
        this.token = token;
        this.id = applicationId;
        this.publicKey = publicKey;
        this.port = port;
        this.commands = [];
        this.console = new Logger_js_1.default('ToD');
        this.functions = functions;
        this.server = new Server_js_1.default(this.port, this);
        this.database = new Database_js_1.default(this);
        this.questions = { dare: dare_json_1.default, nhie: nhie_json_1.default, truth: truth_json_1.default, wyr: wyr_json_1.default };
    }
    get COLORS() {
        return Client.COLORS;
    }
    get EMOTES() {
        return Client.EMOTES;
    }
    async start() {
        this.console.log(`Starting Truth or Dare...`);
        await this.loadCommands();
        await this.updateCommands();
        this.console.success(`Loaded ${this.commands.length} commands!`);
        await this.database.start();
        this.server.start();
    }
    async loadCommands() {
        const commandFileNames = (0, fs_1.readdirSync)(`${__dirname}/../src/commands`).filter(f => f.endsWith('.js'));
        for (const commandFileName of commandFileNames) {
            const commandFile = (await Promise.resolve().then(() => __importStar(require(`../src/commands/${commandFileName}`)))).default;
            this.commands.push(commandFile);
        }
    }
    randomQuestion(type, ratings) {
        const rates = ratings ?? ['pg', 'pg13', 'r'];
        const rating = rates[Math.floor(Math.random() * rates.length)];
        const questions = this.questions[type][rating];
        const index = Math.floor(Math.random() * questions.length);
        return {
            type,
            rating,
            index,
            question: questions[index],
        };
    }
    async compareCommands() {
        const commandList = await superagent_1.default
            .get(`https://discord.com/api/v9/applications/${this.id}/commands`)
            .set('Authorization', 'Bot ' + this.token)
            .then(res => res.body);
        return this.commands.some(com => {
            const command = commandList.find(c => c.name === com.name);
            return (!command ||
                com.description !== command.description ||
                JSON.stringify(command.options || []) !== JSON.stringify(com.options));
        });
    }
    async updateCommands() {
        if (!(await this.compareCommands()))
            return;
        this.console.log('Updating commands...');
        await superagent_1.default
            .put(`https://discord.com/api/v9/applications/${this.id}/commands`)
            .set('Authorization', 'Bot ' + this.token)
            .send(this.commands.map(c => ({
            ...c,
            perms: undefined,
        })));
        this.console.success('Updated commands');
    }
}
exports.default = Client;
Client.COLORS = {
    WHITE: 0xffffff,
    BLURPLE: 0x5865f2,
    GREYPLE: 0x99aab5,
    DARK_BUT_NOT_BLACK: 0x2c2f33,
    NOT_QUITE_BLACK: 0x23272a,
    GREEN: 0x57f287,
    YELLOW: 0xfee7c,
    FUSCHIA: 0xeb459e,
    RED: 0xed4245,
    BLACK: 0xffffff,
    BLUE: 0x3498db,
};
Client.EMOTES = {
    checkmark: ':white_check_mark:',
    xmark: ':x:',
    time: ':stopwatch:',
};
