"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Client_1 = __importDefault(require("../classes/Client"));
require("dotenv/config.js");
const { APPLICATION_ID, PUBLIC_KEY, TOKEN, PORT } = process.env;
const client = new Client_1.default({
    port: Number(PORT),
    token: TOKEN,
    applicationId: APPLICATION_ID,
    publicKey: PUBLIC_KEY,
});
client.start();
