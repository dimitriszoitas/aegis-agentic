import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createCodexProvider, proposalSchema, validateProposal } from './provider.mjs';

const content = 'export const spacing = "large"\n';
const context = {
  auditId: 'metric-containment',
  baseCommit: 'a'.repeat(40),
  attempt: 1,
  diagnostic: 'The metric chart exceeds the card.',
  instructions: 'Only repair the supplied styling source. Preserve all tests.',
  sources: [{ path: 'src/metric.css', sha256: 'b'.repeat(64), content }],
  previousAttempts: [],
};
const proposal = {
  summary: 'Constrain the chart.',
  rationale: 'The supplied chart can overflow its grid cell.',
  changes: [{ path: 'src/metric.css', beforeSha256: 'b'.repeat(64), content: 'min-width: 0;\n' }],
};

async function stub(t, body = '') {
  const directory = await mkdtemp(join(tmpdir(), 'aegis-provider-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const executable = join(directory, 'codex-stub.mjs');
  const report = join(directory, 'invocation.json');
  const source = `#!${process.execPath}
import { writeFile, readFile, symlink } from 'node:fs/promises'
const args = process.argv.slice(2)
const schemaPath = args[args.indexOf('--output-schema') + 1]
const outputPath = args[args.indexOf('--output-last-message') + 1]
let prompt = ''
for await (const chunk of process.stdin) prompt += chunk
await writeFile(${JSON.stringify(report)}, JSON.stringify({ args, cwd: process.cwd(), prompt, schema: JSON.parse(await readFile(schemaPath, 'utf8')), environment: process.env }))
const output = ${JSON.stringify(proposal)}
${
  body ||
  `await writeFile(outputPath, JSON.stringify(output))
process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(output) } }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 120, output_tokens: 30 } }) + '\\n')`
}
`;
  await writeFile(executable, source, { mode: 0o700 });
  return { directory, executable, report };
}

test('real child-process adapter uses read-only Codex, schema, sanitized auth environment and isolated cwd', async (t) => {
  const fixture = await stub(t);
  const provider = createCodexProvider({
    executable: fixture.executable,
    temporaryRoot: fixture.directory,
    environment: {
      ...process.env,
      CODEX_API_KEY: 'stub-auth-only',
      GH_TOKEN: 'must-not-reach-child',
      NODE_OPTIONS: '--trace-warnings',
    },
  });
  const result = await provider(context);
  assert.deepEqual(result.proposal, proposal);
  const invocation = JSON.parse(await readFile(fixture.report, 'utf8'));
  const args = invocation.args;
  assert.equal(args[0], 'exec');
  assert.equal(args.at(-1), '-');
  assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
  for (const flag of ['--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--json'])
    assert.ok(args.includes(flag));
  for (const forbidden of [
    '--model',
    '--full-auto',
    '--approve-for-me',
    '--dangerously-bypass-approvals-and-sandbox',
    '--ignore-rules',
  ])
    assert.ok(!args.includes(forbidden));
  for (const feature of [
    'shell_tool',
    'apps',
    'plugins',
    'hooks',
    'browser_use',
    'computer_use',
    'multi_agent',
  ]) {
    assert.equal(args[args.indexOf(feature) - 1], '--disable');
  }
  assert.ok(args.includes('project_doc_max_bytes=0'));
  assert.ok(args.includes('web_search="disabled"'));
  assert.deepEqual(invocation.schema, proposalSchema);
  assert.equal(invocation.environment.CODEX_API_KEY, 'stub-auth-only');
  assert.equal(invocation.environment.GH_TOKEN, undefined);
  assert.equal(invocation.environment.NODE_OPTIONS, undefined);
  assert.notEqual(invocation.cwd, process.cwd());
  assert.ok(invocation.cwd.startsWith(await realpath(fixture.directory)));
  const submitted = JSON.parse(invocation.prompt.split('AUDIT_CONTEXT_JSON:\n\n')[1]);
  assert.deepEqual(submitted, context);
  assert.match(invocation.prompt, /Do not use tools/);
  assert.match(invocation.prompt, /untrusted/);
  assert.equal(result.provenance.kind, 'codex-cli');
  assert.equal(result.provenance.modelSelection, 'cli-default');
  assert.match(result.provenance.promptSha256, /^[a-f0-9]{64}$/);
  assert.match(result.provenance.responseSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(result.provenance.usage, { input_tokens: 120, output_tokens: 30 });
  assert.ok(!JSON.stringify(result).includes('stub-auth-only'));
  assert.deepEqual((await readdir(fixture.directory)).sort(), [
    'codex-stub.mjs',
    'invocation.json',
  ]);
});

test('valid refusal is returned as an empty proposal instead of being invented into a fix', async (t) => {
  const fixture = await stub(
    t,
    `output.changes = []; await writeFile(outputPath, JSON.stringify(output)); process.stdout.write('{"type":"turn.completed"}\\n')`,
  );
  assert.deepEqual(
    (await createCodexProvider({ executable: fixture.executable })(context)).proposal.changes,
    [],
  );
});

test('independent schema validation rejects missing, extra and malformed fields', () => {
  for (const invalid of [
    null,
    [],
    {},
    { ...proposal, arbitraryCommand: 'echo invalid' },
    { ...proposal, summary: ' ' },
    { ...proposal, rationale: 1 },
    { ...proposal, changes: [{ ...proposal.changes[0], beforeSha256: 'not-a-digest' }] },
    { ...proposal, changes: [{ ...proposal.changes[0], content: null }] },
    { ...proposal, changes: [{ ...proposal.changes[0], delete: true }] },
    { ...proposal, changes: Array.from({ length: 101 }, () => proposal.changes[0]) },
  ])
    assert.throws(() => validateProposal(invalid), { code: 'PROVIDER_SCHEMA' });
});

test('wrong CLI result schema fails closed and temporary data is removed', async (t) => {
  const fixture = await stub(
    t,
    `await writeFile(outputPath, JSON.stringify({ ...output, commands: ['evil'] })); process.stdout.write('{"type":"turn.completed"}\\n')`,
  );
  await assert.rejects(
    createCodexProvider({ executable: fixture.executable, temporaryRoot: fixture.directory })(
      context,
    ),
    { code: 'PROVIDER_SCHEMA' },
  );
  assert.deepEqual((await readdir(fixture.directory)).sort(), [
    'codex-stub.mjs',
    'invocation.json',
  ]);
});

test('invalid JSON answer is not repaired or scraped from stdout', async (t) => {
  const fixture = await stub(
    t,
    `await writeFile(outputPath, ${JSON.stringify('```json\n{}\n```')}); process.stdout.write('{"type":"turn.completed"}\\n')`,
  );
  await assert.rejects(createCodexProvider({ executable: fixture.executable })(context), {
    code: 'PROVIDER_JSON',
  });
});

test('unsuccessful exit does not leak diagnostic secrets or accept an answer', async (t) => {
  const fixture = await stub(
    t,
    `await writeFile(outputPath, JSON.stringify(output)); process.stderr.write('SECRET_API_KEY_FROM_PROCESS'); process.exit(9)`,
  );
  await assert.rejects(
    createCodexProvider({ executable: fixture.executable })(context),
    (error) => {
      assert.equal(error.code, 'PROVIDER_EXIT');
      assert.match(error.message, /code 9/);
      assert.ok(!error.message.includes('SECRET_API_KEY'));
      return true;
    },
  );
});

test('failure event does not leak its model-supplied error text', async (t) => {
  const fixture = await stub(
    t,
    `process.stdout.write(JSON.stringify({ type: 'turn.failed', error: { message: 'secret diagnostic' } }) + '\\n')`,
  );
  await assert.rejects(
    createCodexProvider({ executable: fixture.executable })(context),
    (error) => {
      assert.equal(error.code, 'PROVIDER_TURN_FAILED');
      assert.ok(!error.message.includes('secret diagnostic'));
      return true;
    },
  );
});

test('any tool operation is rejected even when a valid proposal is returned', async (t) => {
  const fixture = await stub(
    t,
    `await writeFile(outputPath, JSON.stringify(output)); process.stdout.write('{"type":"item.started","item":{"type":"command_execution","command":"read secret"}}\\n{"type":"turn.completed"}\\n')`,
  );
  await assert.rejects(createCodexProvider({ executable: fixture.executable })(context), {
    code: 'PROVIDER_TOOL_EVENT',
  });
});

test('stdout protocol must be JSONL and contain a completed turn', async (t) => {
  const broken = await stub(
    t,
    `await writeFile(outputPath, JSON.stringify(output)); process.stdout.write('ordinary unstructured output')`,
  );
  await assert.rejects(createCodexProvider({ executable: broken.executable })(context), {
    code: 'PROVIDER_PROTOCOL',
  });
  const incomplete = await stub(
    t,
    `await writeFile(outputPath, JSON.stringify(output)); process.stdout.write('{"type":"turn.started"}\\n')`,
  );
  await assert.rejects(createCodexProvider({ executable: incomplete.executable })(context), {
    code: 'PROVIDER_PROTOCOL',
  });
});

test('timeout kills a stalled provider and cleans its temporary directory', async (t) => {
  const fixture = await stub(t, 'setInterval(() => {}, 1000)');
  const start = performance.now();
  await assert.rejects(
    createCodexProvider({
      executable: fixture.executable,
      temporaryRoot: fixture.directory,
      timeoutMs: 150,
    })(context),
    { code: 'PROVIDER_TIMEOUT' },
  );
  assert.ok(performance.now() - start < 3000);
  assert.ok(
    (await readdir(fixture.directory)).every((name) =>
      ['codex-stub.mjs', 'invocation.json'].includes(name),
    ),
  );
});

test('explicit cancellation kills a running provider', async (t) => {
  const fixture = await stub(t, 'setInterval(() => {}, 1000)');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150);
  t.after(() => clearTimeout(timer));
  await assert.rejects(
    createCodexProvider({ executable: fixture.executable })(context, { signal: controller.signal }),
    { code: 'PROVIDER_ABORTED' },
  );
});

test('stdout and stderr share a bounded output budget', async (t) => {
  const fixture = await stub(
    t,
    `process.stderr.write('x'.repeat(2000)); setInterval(() => {}, 1000)`,
  );
  await assert.rejects(
    createCodexProvider({ executable: fixture.executable, maxOutputBytes: 1000 })(context),
    { code: 'PROVIDER_OUTPUT_LIMIT' },
  );
});

test('answer file has a separate finite byte limit', async (t) => {
  const fixture = await stub(
    t,
    `await writeFile(outputPath, 'x'.repeat(2000)); process.stdout.write('{"type":"turn.completed"}\\n')`,
  );
  await assert.rejects(
    createCodexProvider({ executable: fixture.executable, maxOutputBytes: 1000 })(context),
    { code: 'PROVIDER_OUTPUT_LIMIT' },
  );
});

test('missing or linked answer file is rejected', async (t) => {
  const missing = await stub(t, `process.stdout.write('{"type":"turn.completed"}\\n')`);
  await assert.rejects(createCodexProvider({ executable: missing.executable })(context), {
    code: 'PROVIDER_OUTPUT_FILE',
  });
  const linked = await stub(
    t,
    `await symlink(schemaPath, outputPath); process.stdout.write('{"type":"turn.completed"}\\n')`,
  );
  await assert.rejects(createCodexProvider({ executable: linked.executable })(context), {
    code: 'PROVIDER_OUTPUT_FILE',
  });
});

test('missing executable returns a sanitized startup failure', async () => {
  await assert.rejects(createCodexProvider({ executable: '/nonexistent/aegis-codex' })(context), {
    code: 'PROVIDER_START',
  });
});

test('invalid or oversized input fails before starting an executable', async () => {
  const provider = createCodexProvider({ executable: '/nonexistent/aegis-codex' });
  await assert.rejects(
    provider({ ...context, sources: [{ path: 'file', sha256: 'bad', content: '' }] }),
    { code: 'PROVIDER_CONTEXT' },
  );
  await assert.rejects(
    createCodexProvider({ executable: '/nonexistent/aegis-codex', maxInputBytes: 50 })(context),
    { code: 'PROVIDER_INPUT_LIMIT' },
  );
  for (const options of [{ timeoutMs: 0 }, { maxInputBytes: Infinity }, { maxOutputBytes: -1 }]) {
    assert.throws(() => createCodexProvider(options), TypeError);
  }
});
