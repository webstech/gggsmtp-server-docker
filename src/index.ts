#!/usr/bin/env node

import { Command } from "commander";
// import Mail from "nodemailer/lib/mailer";
// import MailComposer from "nodemailer/lib/mail-composer";
// import { AddressObject, HeaderLines, ParsedMail } from "mailparser";
// import simpleGit, { SimpleGit } from "simple-git";
// import { eMail, testSmtpServer, testSmtpServerOptions } from "test-smtp-server";
// import { testSmtpServer, testSmtpServerOptions } from "test-smtp-server";
// import * as fs from "fs";
// import path from "path";
// import { setInterval } from "timers/promises";
import { emailHandler, emailHandlerOptions } from "./lib/emailHandler";
/*
interface mailOptions {
  git: SimpleGit;
  file: string;
  repoDir: string;
  seenMail: number;
  repliedMail: number;
  // smtpserver: testSmtpServer<mailOptions> | undefined;
  smtpserver: testSmtpServer | undefined;
}
*/
const commander = new Command();

commander
  .version(process.env.npm_package_version || "1.0.0")
  .usage("[options]")
  .description(`Run tests for ${process.env.npm_package_name}`)
  .option("--debug", "Trace extra scum messages")
  .option("--port <number>", "port to use for SMTP server.", process.env["MAILPORT"])
  .option("--host <host>", "SMTP server host name or IP address.", "localhost")
  .option("--timeout <number>", "mail queue scan interval to reply.", "1")
  .option("--mail <dir>", "location of mail repo.", process.env["MAILREPO"])
  .option("--file <filename>", "file to be updated.", process.env.MAILFILE || "1")
  .option("--gitauthor <name>", "author for git commits.", process.env["MAIL-GIT-AUTHOR"])
  .option("--gitemail <address>", "author email for git commits.", process.env["MAIL-GIT-EMAIL"])
  .option("--allow-any", "allow connections from anywhere.")
  .parse(process.argv);

interface commanderOptions {
  debug: boolean | undefined;
  file: string;
  port: number | undefined;
  mail: string;
  timeout: string;
  gitauthor: string;
  gitemail: string;
}

const commandOptions = commander.opts<commanderOptions>();
/*
const repoDir = path.resolve(`${commandOptions.mail || process.env["MAILREPO"]}`);
const git= simpleGit({baseDir: repoDir,
    config: ["user.name=Chris. Webster",
            "user.email=chris@webstech.net"]});

const mailOpts: mailOptions = {
  git: git,
  file: commandOptions.file || process.env.MAILFILE || "1",
  repoDir: repoDir,
  seenMail: 0,
  repliedMail: 0,
  smtpserver: undefined,
};
*/
(async (): Promise<void> => {
    const handlerOptions: emailHandlerOptions = {... commandOptions};
    const handler = new emailHandler(handlerOptions); // {... commandOptions});
    await handler.run();
})().catch((reason: Error) => {
  console.log(`Caught error ${reason}:\n${reason.stack}\n`);
  process.exit(1);
});
