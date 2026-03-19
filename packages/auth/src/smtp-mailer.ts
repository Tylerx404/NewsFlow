/// <reference path="./nodemailer.d.ts" />

import nodemailer from "nodemailer";

import prisma from "@NewsFlow/db";

import {
  type SmtpTransportConfig,
  getSmtpTransportConfig,
  SmtpConfigError,
} from "./smtp-config";

type PrismaClient = typeof prisma;

interface SendSmtpMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function getFromAddress(config: SmtpTransportConfig) {
  return config.fromName
    ? `"${config.fromName}" <${config.fromEmail}>`
    : config.fromEmail;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendSmtpMail(
  input: SendSmtpMailInput,
  db: Pick<PrismaClient, "smtpConfig"> = prisma
) {
  const config = await getSmtpTransportConfig(db);

  if (!config) {
    throw new SmtpConfigError(
      "SMTP is not configured yet. Open Admin System Ops to finish SMTP setup."
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  });

  await transporter.sendMail({
    from: getFromAddress(config),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendVerificationEmailWithSmtp(
  input: {
    user: {
      email: string;
      name: string;
    };
    url: string;
  },
  db: Pick<PrismaClient, "smtpConfig"> = prisma
) {
  const safeName = input.user.name.trim() || input.user.email;
  const escapedName = escapeHtml(safeName);
  const escapedUrl = escapeHtml(input.url);

  await sendSmtpMail(
    {
      to: input.user.email,
      subject: "Verify your NewsFlow email",
      text: [
        `Hello ${safeName},`,
        "",
        "Verify your NewsFlow email address by opening the link below:",
        input.url,
        "",
        "If you did not create this account, you can ignore this email.",
      ].join("\n"),
      html: [
        `<p>Hello ${escapedName},</p>`,
        "<p>Verify your NewsFlow email address by opening the link below:</p>",
        `<p><a href="${escapedUrl}">${escapedUrl}</a></p>`,
        "<p>If you did not create this account, you can ignore this email.</p>",
      ].join(""),
    },
    db
  );
}
