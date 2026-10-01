import * as readline from 'node:readline';

/**
 * Obtains the email confirmation code for the registration E2E test.
 *
 * Two modes, in priority order:
 *
 * 1. Non-interactive: if the CONFIRMATION_CODE env var is set, it is used
 *    directly. Handy for re-runs where you already know the code, or for a
 *    (future) automated mailbox fetch that exports the code into the env.
 *
 * 2. Interactive: otherwise the function pauses the test and prompts on the
 *    terminal (stdin) for the code that was emailed to the tester. This is the
 *    intended default — the code is delivered to a human's inbox and typed in.
 *    Requires running Playwright with output attached to a TTY (i.e. a normal
 *    local run, not detached CI). Run headed for the best experience:
 *      npx playwright test tests/ui/registration.spec.ts --project=ui-tests --headed
 *
 * @param email     The address the code was sent to (shown in the prompt).
 * @param timeoutMs How long to wait for input before giving up.
 */
export async function getConfirmationCode(email: string, timeoutMs = 240_000): Promise<string> {
  const fromEnv = process.env.CONFIRMATION_CODE?.trim();
  if (fromEnv) {
    console.log(`[registration] Using CONFIRMATION_CODE from environment for ${email}.`);
    return fromEnv;
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      'No confirmation code available. Either run the test interactively in a terminal ' +
        '(so you can type the code that was emailed to you), or set the CONFIRMATION_CODE env var. ' +
        `Expected the code sent to ${email}.`,
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        rl.close();
        reject(new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the confirmation code.`));
      }, timeoutMs);

      console.log('\n============================================================');
      console.log(`  A verification code was sent to: ${email}`);
      console.log('  Check that inbox and paste the code below, then press Enter.');
      console.log('============================================================');

      rl.question('Verification code: ', (answer) => {
        clearTimeout(timer);
        rl.close();
        const code = answer.trim();
        if (!code) {
          reject(new Error('Empty confirmation code entered.'));
          return;
        }
        resolve(code);
      });
    });
  } finally {
    rl.close();
  }
}
