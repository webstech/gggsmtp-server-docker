import Mail from "nodemailer/lib/mailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { AddressObject, HeaderLines, ParsedMail } from "mailparser";
import simpleGit, { SimpleGit } from "simple-git";
// import { eMail, testSmtpServer, testSmtpServerOptions } from "test-smtp-server";
import { testSmtpServer, testSmtpServerOptions } from "test-smtp-server";
import * as fs from "fs";
import path from "path";
import { setInterval } from "timers/promises";

export interface emailHandlerOptions {
  file: string;
  debug: boolean | undefined;
  port: number | undefined;
  mail: string;
  timeout: string;
  gitauthor: string;
  gitemail: string;
}

export class emailHandler {
  private debug: boolean;
  private git: SimpleGit;
  private gitauthor: string;
  private gitemail: string;
  private file: string;
  private repoDir: string;
  private seenMail: number = 0;
  private repliedMail: number = 0;
  private smtpserver: testSmtpServer;
  private timeoutMS: number;

  public constructor(options: emailHandlerOptions) {
    this.debug = options.debug || false;
    this.repoDir = path.resolve(options.mail);
    this.gitauthor = options.gitauthor;
    this.gitemail = options.gitemail;
    this.file = options.file;
    this.git = simpleGit({
      baseDir: this.repoDir,
      config: [`user.name=${this.gitauthor}`, `user.email=${this.gitemail}`],
    });
    this.timeoutMS = parseInt(options.timeout) * 1000;
    const serverOptions: testSmtpServerOptions = {
        // <mailOptions> = {
        // emailHandler: processMail,
        // userObject: mailOpts,
        debug: this.debug ? console.log : undefined,
      };

      this.smtpserver = new testSmtpServer(serverOptions);
    }

  public async run(): Promise<void> {
    this.smtpserver.startServer(); // start listening
    console.log(`Listening on port ${this.smtpserver.getPort()}`);
    console.log(`Mail repo is ${this.repoDir}/${this.file}`);
    console.log(`Timeout is ${this.timeoutMS}`);

    let terminating = false;

    ["SIGTERM", "SIGINT"].forEach((sig) =>
      process.on(sig, () => {
        console.log("Shutting down...");
        this.smtpserver.stopServer(); // terminate server
        terminating = true;
      })
    );

    try {
      for await (const _zip of setInterval(this.timeoutMS)) {
        await this.checkMail();
        if (terminating) {
          throw new Error("Terminating by request");
        }
      }
    } catch (error) {
      if (!terminating) {
        throw error;
      }
    }
  }

  private async checkMail(): Promise<void> {
    const mails = this.smtpserver.getEmails();

    if (mails && mails.length) {
      for (const email of mails.slice(this.repliedMail)) {
        await this.gitUpdate(email.buffer!, "New email");
        this.seenMail++;
      }

      for (const mail of mails.slice(this.repliedMail, this.seenMail)) {
        console.log(`Checking mail entry <${this.repliedMail}>`);
        console.log(mail.buffer);
        const parsed = await mail.getParsed();

        const builder = new MailComposer(this.buildReply(parsed));
        const buff = await builder.compile().build();
        await this.gitUpdate(buff, ["Update", "Reply"]);
        this.repliedMail++;
      }
    }
  }

  /* If a callback is implemented in the server, it would call here
  private async processMail(email: eMail): boolean {
    await this.gitUpdate(email.buffer!, "New email");
    this.seenMail++;

    return true;
  }
  */

  /**
   * Add email to the repo.
   *
   * @param options mailOptions
   * @param buff Buffer containing email
   * @param message git commit message
   */
  private async gitUpdate(buff: Buffer, message: string | string[]): Promise<void> {
    const fd = fs.openSync(`${this.repoDir}/${this.file}`, "w");
    const email = buff.toString("utf-8");

    fs.writeSync(fd, email.replace(/\r\n/g, "\n"));
    fs.closeSync(fd);

    await this.git.add(this.file);
    await this.git.commit(message);
  }

  /**
   * Build a reply email from an original email.
   * @param parsed parsed email
   * @returns simple reply
   */
  private buildReply(parsed: ParsedMail): Mail.Options {
    const options: Mail.Options = {};

    options.from = "Code Bot<bot@example.com>";
    options.sender = "Code Bot<bot@example.com>";
    options.to = `<${(<AddressObject>parsed.to!).value[0].address}>`;
    options.replyTo = `<${(<AddressObject>parsed.to!).value[0].address}>`;
    options.inReplyTo = this.getHeader(parsed.headerLines, "message-id");
    options.subject = parsed.subject;
    options.text = `This email is being reviewed.\n\n   ${parsed.text!.replace(
      /\n/g,
      "\n   "
    )}`;

    return options;
  }

  /**
   * Get a header key value.
   * @param headers array from parsed email
   * @param key name of key value
   * @returns header line value
   */
  private getHeader(headers: HeaderLines, key: string): string {
    for (const entry of headers) {
      if (entry.key === key) {
        const value = entry.line.match(/: (.*)/);
        if (!value) {
          throw new Error(`Unexpected line: ${entry.line}`);
        }

        return value[1];
      }
    }

    throw new Error(`Requested key "${key}" not found`);
  }
}
