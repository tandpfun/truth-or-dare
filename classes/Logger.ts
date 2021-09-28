import chalk from 'chalk';

export default class Logger {
  prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  getTimestamp() {
    const date = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  print(content: any, color: string, type: string, typeColor: string) {
    console.log(
      chalk`{${color} [${this.getTimestamp()}]} {${typeColor} ${type}} {${color} [${this.prefix}]}`,
      content
    );
  }

  log = this.info;

  info(content: any) {
    this.print(content, 'cyan.bold', ' INFO ', 'bgCyan.black');
  }

  success(content: any) {
    this.print(content, 'green.bold', ' INFO ', 'bgGreen.black');
  }

  error(content: any) {
    this.print(content, 'red.bold', ' ERROR ', 'bgRed.black');
  }

  warn(content: any) {
    this.print(content, 'yellow.bold', ' WARN ', 'bgYellow.black');
  }
}
