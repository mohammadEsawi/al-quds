/**
 * Sets a new password for a dashboard user (for when the password was forgotten):
 *
 *   npm run admin:reset-password -- someone@example.com
 *
 * The new password is typed at the prompt (hidden), never passed on the command line, and every
 * existing session of that user is signed out. Applies the same password rules as the dashboard.
 */
import readline from 'node:readline';
import { hashPassword } from '../src/lib/password.js';
import { weakPasswordReason } from '../src/lib/passwordPolicy.js';
import { prisma } from '../src/lib/prisma.js';
import { recordAudit } from '../src/services/audit.service.js';

// One interface for the whole session (piped input would be consumed by the first one otherwise).
const interactive = Boolean(process.stdin.isTTY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: interactive });
const lines = rl[Symbol.asyncIterator]();
let muted = false;
if (interactive) {
  // While `muted`, nothing readline would echo (the typed password) reaches the screen.
  const out = rl as unknown as { _writeToOutput: (text: string) => void };
  const write = out._writeToOutput.bind(out);
  out._writeToOutput = (text) => (muted ? undefined : write(text));
}

async function ask(question: string, hidden: boolean): Promise<string> {
  process.stdout.write(question);
  muted = hidden && interactive;
  const { value, done } = await lines.next();
  muted = false;
  if (hidden && interactive) process.stdout.write('\n');
  if (done) throw new Error('No input received.');
  return String(value);
}

async function main() {
  const email = (process.argv[2] ?? (await ask('User email: ', false))).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with the email ${email}.`);

  const password = await ask('New password (12+ characters): ', true);
  const again = await ask('Repeat the password: ', true);
  if (password !== again) throw new Error('The two passwords do not match.');
  if (password.length < 12) throw new Error('The password must be at least 12 characters.');
  const weak = weakPasswordReason(password);
  if (weak) throw new Error(`${weak}. Choose a longer, less predictable password.`);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date() },
  });
  await recordAudit({ actorEmail: 'cli', action: 'cli password reset', targetId: user.id, detail: email });
  console.log(`✓ Password updated for ${email}. All of their sessions were signed out.`);
}

main()
  .catch((error) => {
    console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    return prisma.$disconnect();
  });
