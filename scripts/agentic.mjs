import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
if (!existsSync(fileURLToPath(new URL('../agent-kit/runtime/core.mjs', import.meta.url)))) {
  console.error('Build the portable kit first: pnpm agentic:kit');
  process.exitCode = 1;
} else {
  await import('../agent-kit/bin/aegis.mjs');
}
