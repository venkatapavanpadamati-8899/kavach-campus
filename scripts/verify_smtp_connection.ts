/**
 * KAVACH CAMPUS — SMTP EMAIL VERIFICATION UTILITY
 *
 * Verifies SMTP connectivity, TLS negotiation, and authentication against
 * configured institutional mail server.
 *
 * Safety Boundaries:
 * 1. Never outputs or logs plaintext SMTP passwords or sensitive tokens.
 * 2. Masks user and recipient email addresses in console output.
 * 3. Does not send test email unless explicitly invoked with --send-test <recipient>.
 * 4. Fails closed when credentials are missing or invalid.
 *
 * Usage:
 *   npx tsx scripts/verify_smtp_connection.ts
 *   npx tsx scripts/verify_smtp_connection.ts --send-test user@example.edu
 */

import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load local environment if present
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

async function main() {
  console.log('====================================================');
  console.log('  Kavach Campus — SMTP Email Verification Utility   ');
  console.log('====================================================\n');

  const host = process.env.SMTP_HOST?.trim();
  const portStr = process.env.SMTP_PORT?.trim() || '587';
  const port = parseInt(portStr, 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_FROM_EMAIL?.trim();
  const enableRealDelivery = process.env.ENABLE_REAL_EMAIL_DELIVERY === 'true' || process.env.ENABLE_REAL_NOTIFICATIONS === 'true';

  console.log('1. Configuration Audit:');
  console.log(`   - SMTP_HOST:                  ${host ? host : '[NOT SET]'}`);
  console.log(`   - SMTP_PORT:                  ${portStr} (${isNaN(port) ? 'INVALID' : 'Valid'})`);
  console.log(`   - SMTP_SECURE:                ${process.env.SMTP_SECURE || (port === 465 ? 'true (inferred)' : 'false (inferred)')}`);
  console.log(`   - SMTP_USER:                  ${user ? maskEmail(user) : '[NOT SET]'}`);
  console.log(`   - SMTP_PASS:                  ${pass ? `[CONFIGURED (${pass.length} chars)]` : '[NOT SET]'}`);
  console.log(`   - SMTP_FROM / SMTP_FROM_EMAIL:${from ? from : (user ? `${maskEmail(user)} (fallback to SMTP_USER)` : '[NOT SET]')}`);
  console.log(`   - ENABLE_REAL_EMAIL_DELIVERY: ${enableRealDelivery ? 'true (ENABLED)' : 'false (DISABLED)'}`);

  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');
  if (isNaN(port) || port < 1 || port > 65535) missing.push('SMTP_PORT (valid integer 1-65535)');

  if (missing.length > 0) {
    console.log('\n[RESULT] Configuration: FAIL');
    console.log(`Missing required variables: ${missing.join(', ')}`);
    console.log('\nTo configure SMTP, set these variables in .env.local or Vercel Environment Variables.');
    process.exit(1);
  }

  console.log('\n2. Testing SMTP Server Connectivity (transporter.verify)...');

  const isSecure = process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  try {
    const verified = await transporter.verify();
    if (verified) {
      console.log('   [SUCCESS] SMTP connection and authentication verified successfully.');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('   [FAIL] SMTP connection or authentication failed:');
    console.error(`   ${msg}`);
    process.exit(1);
  }

  // Check if a test send was requested
  const sendTestIdx = process.argv.indexOf('--send-test');
  if (sendTestIdx !== -1 && sendTestIdx < process.argv.length - 1) {
    const testRecipient = process.argv[sendTestIdx + 1];
    if (!testRecipient || !testRecipient.includes('@')) {
      console.error(`\nInvalid test recipient email: ${testRecipient}`);
      process.exit(1);
    }

    if (!enableRealDelivery) {
      console.warn('\n[WARNING] ENABLE_REAL_EMAIL_DELIVERY is false. Real email dispatch will be rejected by application code.');
      console.warn('Set ENABLE_REAL_EMAIL_DELIVERY=true in your environment to enable live email delivery.');
    }

    console.log(`\n3. Sending Single Verification Test Email to ${maskEmail(testRecipient)}...`);
    const sender = from || user;
    try {
      const info = await transporter.sendMail({
        from: sender,
        to: testRecipient,
        subject: 'Kavach Campus - SMTP Verification Test',
        text: `Hello,\n\nThis is a verification test from the Kavach Campus email delivery system.\nTimestamp: ${new Date().toISOString()}\n\n-- Kavach Campus System`,
      });

      console.log('   [SUCCESS] Email dispatched successfully!');
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Response:   ${info.response}`);
    } catch (sendErr: unknown) {
      const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error('   [FAIL] Failed to send test email:');
      console.error(`   ${msg}`);
      process.exit(1);
    }
  } else {
    console.log('\n[INFO] To send a single test email, rerun with:');
    console.log('  npx tsx scripts/verify_smtp_connection.ts --send-test your-email@domain.com');
  }

  console.log('\n====================================================');
  console.log('  SMTP Verification Completed Successfully          ');
  console.log('====================================================');
}

main().catch((e) => {
  console.error('Fatal error during SMTP verification:', e);
  process.exit(1);
});
