import chalk from "chalk";

export default class Logger {
  constructor(prefix) {
    this.prefix = prefix;
  }

  get timestamp() {
    const date = new Date();
    const pad = (value) => value.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`;
  }

  log(...args) {
    this.info(...args);
  }

  info(content, prefixes = []) {
    console.log(
      content
        .split('\n')
        .map(
          (l) =>
            chalk`{cyan.bold [${
              this.timestamp
            }]} {bgCyan.black  INFO }  {cyan.bold [${this.prefix}]${
              prefixes.length ? ' ' : ''
            }${prefixes.map((p) => `[${p}]`).join(' ')}} ${l}`
        )
        .join('\n')
    );
  }

  success(content, prefixes = []) {
    console.log(
      content
        .split('\n')
        .map(
          (l) =>
            chalk`{green.bold [${
              this.timestamp
            }]} {bgGreen.black  INFO }  {green.bold [${this.prefix}]${
              prefixes.length ? ' ' : ''
            }${prefixes.map((p) => `[${p}]`).join(' ')}} ${l}`
        )
        .join('\n')
    );
  }

  error(content, prefixes = []) {
    console.error(
      content
        .split('\n')
        .map(
          (l) =>
            chalk`{red.bold [${
              this.timestamp
            }]} {bgRed.black  ERROR } {red.bold [${this.prefix}]${
              prefixes.length ? ' ' : ''
            }${prefixes.map((p) => `[${p}]`).join(' ')}} ${l}`
        )
        .join('\n')
    );
  }

  warn(content, prefixes = []) {
    console.warn(
      content
        .split('\n')
        .map(
          (l) =>
            chalk`{yellow.bold [${
              this.timestamp
            }]} {bgYellow.black  WARN }  {yellow.bold [${this.prefix}]${
              prefixes.length ? ' ' : ''
            }${prefixes.map((p) => `[${p}]`).join(' ')}} ${l}`
        )
        .join('\n')
    );
  }
}