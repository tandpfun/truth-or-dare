"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
class Logger {
    constructor(prefix) {
        this.log = this.info;
        this.prefix = prefix;
    }
    getTimestamp() {
        const date = new Date();
        const pad = (value) => value.toString().padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    print(content, color, type, typeColor) {
        console.log((0, chalk_1.default) `{${color} [${this.getTimestamp()}]} {${typeColor} ${type}} {${color} [${this.prefix}]}`, content);
    }
    info(content) {
        this.print(content, 'cyan.bold', ' INFO ', 'bgCyan.black');
    }
    success(content) {
        this.print(content, 'green.bold', ' INFO ', 'bgGreen.black');
    }
    error(content) {
        this.print(content, 'red.bold', ' ERROR ', 'bgRed.black');
    }
    warn(content) {
        this.print(content, 'yellow.bold', ' WARN ', 'bgYellow.black');
    }
}
exports.default = Logger;
