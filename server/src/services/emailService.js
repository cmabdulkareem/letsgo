import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../config/logger.js';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Email delivery boundary. The console provider logs the message in development so
 * no paid service is required; switching to SMTP only requires env configuration.
 */
export async function sendEmail({ to, subject, text, html }) {
  if (env.emailProvider === 'smtp' && env.smtp.host) {
    try {
      await getTransporter().sendMail({ from: env.emailFrom, to, subject, text, html });
      logger.info('email.sent', { to, subject });
      return;
    } catch (err) {
      logger.error('email.failed', { to, subject, error: err.message });
      // Fall through to console output so flows remain testable in dev.
    }
  }
  logger.info('email.console', {
    to,
    subject,
    body: text,
  });
}

export function buildVerificationEmail(verifyUrl) {
  return {
    subject: 'Verify your Let\'s Go email address',
    text: `Welcome to Let's Go! Confirm your email address by opening this link (valid for 24 hours):\n\n${verifyUrl}\n\nIf you did not create an account, you can ignore this message.`,
  };
}

export function buildPasswordResetEmail(resetUrl) {
  return {
    subject: 'Reset your Let\'s Go password',
    text: `We received a request to reset your password. Open this link to choose a new one (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this message. Your password has not changed.`,
  };
}
