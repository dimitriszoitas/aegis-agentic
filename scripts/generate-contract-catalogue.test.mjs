import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildContractCatalogue,
  cataloguePath,
  generateContractCatalogue,
  loadCatalogueInputs,
  validateComponentContract,
} from './generate-contract-catalogue.mjs';

const original = await loadCatalogueInputs();
const fixture = () => structuredClone(original);
const mutateJson = (input, path, change) => {
  const value = JSON.parse(input.files[path]);
  change(value);
  input.files[path] = JSON.stringify(value);
};
const binding = (input, change) => mutateJson(input, 'contracts/catalogue-bindings.json', change);
const schema = JSON.parse(original.files['schemas/component-contract.schema.json']);

test('catalogue accounts for every API family, authored-only entry and separate protocol', () => {
  const output = buildContractCatalogue(fixture());
  assert.equal(output.entries.length, 111);
  assert.deepEqual(output.coverage, {
    apiFamilies: 107,
    apiFamiliesWithAuthoredBehavior: 29,
    apiFamiliesWithoutAuthoredBehavior: 78,
    authoredComponentPatternContracts: 31,
    authoredOnlyEntries: 2,
    systemProtocolContracts: 2,
    entriesWithLinkedChecks: 27,
    entriesWithLinkedEvidence: 1,
    entriesWithReportedEvidence: 1,
  });
  assert.equal(
    output.entries.find((entry) => entry.id === 'workspace-api').coverage.behaviorAuthored,
    false,
  );
  assert.equal(
    output.entries.find((entry) => entry.id === 'workspace-api').coverage.systemContractAuthored,
    true,
  );
});

test('explicit mappings never equate the FilteredDataset renderer with FilterBar', () => {
  const output = buildContractCatalogue(fixture());
  assert.equal(
    output.entries.find((entry) => entry.id === 'patterns-filterbar').contract.id,
    'filter-bar',
  );
  assert.equal(output.entries.find((entry) => entry.id === 'dataset-filtering').api, null);
  const input = fixture();
  binding(input, (value) => {
    value.bindings.find((item) => item.contractId === 'dataset-filtering').apiFamilyId =
      'patterns-filterbar';
  });
  assert.throws(
    () => buildContractCatalogue(input),
    /declared implementation|Duplicate binding API family/,
  );
});

test('source inclusion alone cannot map a nested dependency to the wrong public family', () => {
  const input = fixture();
  binding(input, (value) => {
    value.bindings.find((item) => item.contractId === 'button').apiFamilyId =
      'components-actions-iconbutton';
  });
  assert.throws(() => buildContractCatalogue(input), /does not export/);
});

test('all canonical authored contracts validate against the corrected closed schema', () => {
  for (const path of original.authoredPaths)
    assert.deepEqual(validateComponentContract(JSON.parse(original.files[path]), schema), [], path);
  assert.equal(JSON.parse(original.files['contracts/agentic/page-layout.json']).states, undefined);
});

test('contract schema rejects missing baseline behavior, unknown fields and invalid version-specific properties', () => {
  const cases = [
    [
      'button',
      (value) => {
        delete value.states;
      },
    ],
    [
      'button',
      (value) => {
        value.unreviewedRule = true;
      },
    ],
    [
      'token-input',
      (value) => {
        value.version = 3;
      },
    ],
    [
      'token-input',
      (value) => {
        value.defaults.confirmationMode = 'optimistic';
      },
    ],
    [
      'token-input',
      (value) => {
        value.defaults.commitKeys = ['Escape'];
      },
    ],
    [
      'token-input',
      (value) => {
        value.defaults.unreviewed = true;
      },
    ],
    [
      'token-input',
      (value) => {
        value.evidence = '../outside.json';
      },
    ],
    [
      'page-layout',
      (value) => {
        delete value.publicApi;
      },
    ],
    [
      'page-layout',
      (value) => {
        value.publicApi.ContentGrid.defaultMaxColumns = 8;
      },
    ],
    [
      'page-layout',
      (value) => {
        value.publicApi.ReadingColumn.extra = 'anything';
      },
    ],
    [
      'page-layout',
      (value) => {
        value.verification = 'certified';
      },
    ],
  ];
  for (const [id, change] of cases) {
    const value = JSON.parse(original.files[`contracts/agentic/${id}.json`]);
    change(value);
    assert(validateComponentContract(value, schema).length > 0, `${id}: ${change}`);
  }
});

test('unsupported schema validation keywords fail instead of being silently ignored', () => {
  assert.throws(
    () => validateComponentContract({}, { type: 'object', unknownValidation: true }),
    /Unsupported contract schema keyword/,
  );
});

test('source-backed requirements reject missing ownership, unsupported kinds and unsafe citations', () => {
  const contract = JSON.parse(original.files['contracts/agentic/data-grid.json']);
  for (const change of [
    (value) => {
      delete value.ownership;
    },
    (value) => {
      value.requirements[0].kind = 'certified';
    },
    (value) => {
      value.requirements[0].sources = [];
    },
    (value) => {
      value.requirements[0].sources = ['../outside.tsx'];
    },
    (value) => {
      value.requirements[0].approved = true;
    },
    (value) => {
      value.status = 'production-certified';
    },
    (value) => {
      value.id = 'page-layout';
    },
  ]) {
    const value = structuredClone(contract);
    change(value);
    assert(validateComponentContract(value, schema).length > 0, String(change));
  }
});

test('requirements must have unique IDs, accurate token ownership and implementation citations', () => {
  const cases = [
    [
      (value) => {
        value.requirements[1].id = value.requirements[0].id;
      },
      /Duplicate requirement ID/,
    ],
    [
      (value) => {
        value.tokenGroup = 'actions';
      },
      /token group differs/,
    ],
    [
      (value) => {
        value.requirements.find((requirement) => requirement.kind === 'component').sources = [
          'skills/references/design-contract.md',
        ];
      },
      /must cite a family implementation source/,
    ],
    [
      (value) => {
        value.requirements[0].sources.push('src/missing.tsx');
      },
      /Missing source/,
    ],
    [
      (value) => {
        value.requirements[0].statement = '   ';
      },
      /must be nonempty/,
    ],
    [
      (value) => {
        value.ownership.host = ['  '];
      },
      /nonempty responsibilities/,
    ],
  ];
  for (const [change, expected] of cases) {
    const input = fixture();
    mutateJson(input, 'contracts/agentic/data-grid.json', change);
    assert.throws(() => buildContractCatalogue(input), expected);
  }
});

test('requirement citations retain exact source hashes independently of evidence or approval', () => {
  const input = fixture();
  const first = buildContractCatalogue(input);
  const entry = first.entries.find((entry) => entry.registryId === 'data-grid');
  const paths = [
    ...new Set(entry.contract.document.requirements.flatMap((item) => item.sources)),
  ].sort();
  assert.deepEqual(entry.contract.references.map((item) => item.path).sort(), paths);
  for (const reference of entry.contract.references)
    assert.equal(
      reference.sha256,
      createHash('sha256').update(input.files[reference.path]).digest('hex'),
    );
  assert.equal(entry.coverage.evidenceReported, false);
  assert.equal(entry.contract.document.verification, 'not-certified-by-this-contract');
  const implementation = 'src/components/data-grid/data-grid.tsx';
  input.files[implementation] += '\n// source changed after contract authoring\n';
  const next = buildContractCatalogue(input);
  const updated = next.entries.find((item) => item.registryId === 'data-grid');
  assert.notEqual(
    updated.contract.references.find((item) => item.path === implementation).sha256,
    entry.contract.references.find((item) => item.path === implementation).sha256,
  );
  assert.notEqual(next.sourceDigest, first.sourceDigest);
  assert.equal(updated.contract.raw, entry.contract.raw);
  assert.equal(updated.coverage.evidenceReported, false);
});

test('transitive dependencies and global styles cannot stand alone as component requirement citations', () => {
  const api = JSON.parse(original.files['public/ai/components/components-data-datagrid.json']);
  for (const path of ['src/components/button/button.tsx', 'src/styles/globals.css']) {
    assert(api.sourceFiles.includes(path), `${path} is a transitive DataGrid API source`);
    const input = fixture();
    mutateJson(input, 'contracts/agentic/data-grid.json', (value) => {
      value.requirements.find((requirement) => requirement.kind === 'component').sources = [path];
    });
    assert.throws(() => buildContractCatalogue(input), /must cite a family implementation source/);
  }
});

test('stale registry and binding contract versions are rejected', () => {
  const staleBinding = fixture();
  mutateJson(staleBinding, 'contracts/agentic/button.json', (value) => {
    value.version = 2;
  });
  assert.throws(() => buildContractCatalogue(staleBinding), /Stale binding contract version/);
  const staleRegistry = fixture();
  mutateJson(staleRegistry, 'registry/canonical.json', (value) => {
    value.entries[0].version = 2;
  });
  assert.throws(() => buildContractCatalogue(staleRegistry), /Stale registry contract version/);
});

test('missing, duplicate and unknown bindings fail rather than silently changing coverage', () => {
  for (const change of [
    (value) => value.bindings.pop(),
    (value) => value.bindings.push(value.bindings[0]),
    (value) => {
      value.bindings[0].apiFamilyId = 'unlisted-family';
    },
    (value) => {
      value.bindings[0].certified = true;
    },
    (value) => value.protocols.pop(),
  ]) {
    const input = fixture();
    binding(input, change);
    assert.throws(() => buildContractCatalogue(input));
  }
});

test('authored-only mappings are rejected when the implementation gains an API family', () => {
  const input = fixture();
  binding(input, (value) => {
    value.bindings[0].apiFamilyId = null;
  });
  assert.throws(() => buildContractCatalogue(input), /Stale authored-only binding/);
});

test('invalid source mapping and missing or unsafe linked references fail closed', () => {
  for (const change of [
    (value) => {
      value.bindings[0].implementation = 'src/components/card/card.tsx';
    },
    (value) => {
      value.bindings[4].checks[0].path = 'missing.test.ts';
    },
    (value) => {
      value.bindings[4].checks[0].path = '../outside.test.ts';
    },
    (value) => {
      value.bindings[4].checks[0].scope = '';
    },
  ]) {
    const input = fixture();
    binding(input, change);
    assert.throws(() => buildContractCatalogue(input));
  }
});

test('linked checks and evidence remain distinct from source-declared requirements and approval', () => {
  const output = buildContractCatalogue(fixture());
  const button = output.entries.find((entry) => entry.registryId === 'button');
  assert.equal(button.coverage.behaviorAuthored, true);
  assert.equal(button.coverage.checksLinked, false);
  assert.equal(button.coverage.evidenceReported, false);
  assert.equal(button.contract.document.verification, 'not-certified-by-this-contract');
  const token = output.entries.find((entry) => entry.registryId === 'token-input');
  assert.equal(token.coverage.evidenceReported, true);
  assert.match(token.limitations.join(' '), /does not rerun checks or establish owner approval/);
  assert.equal(Object.hasOwn(token.coverage, 'certified'), false);
});

test('stale evidence remains honestly reported with an explicit source mismatch', () => {
  const input = fixture();
  input.files['src/agentic/components/TokenInput.tsx'] += '\n// later change\n';
  const token = buildContractCatalogue(input).entries.find(
    (entry) => entry.registryId === 'token-input',
  );
  assert.equal(token.evidence[0].sourceMatch, 'mismatch');
  assert.equal(token.evidence[0].reportedStatus, 'experiment-verified-with-bounded-evidence');
});

test('deterministic data hashes all input bytes and retains exact authored source text', () => {
  const input = fixture();
  const first = buildContractCatalogue(input);
  assert.deepEqual(buildContractCatalogue(input), first);
  assert.deepEqual(
    buildContractCatalogue({
      ...input,
      files: Object.fromEntries(Object.entries(input.files).reverse()),
    }),
    first,
  );
  const token = first.entries.find((entry) => entry.registryId === 'token-input');
  assert.equal(token.contract.raw, input.files['contracts/agentic/token-input.json']);
  input.files['contracts/agentic/button.json'] += '\n';
  assert.notEqual(buildContractCatalogue(input).sourceDigest, first.sourceDigest);
});

test('generation changes only its catalogue file and --check detects stale output without writing', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'aegis-contract-catalogue-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [path, bytes] of Object.entries(original.files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  const sentinel = join(root, 'public/ai/unrelated.json');
  await writeFile(sentinel, 'keep this asset\n');
  await generateContractCatalogue({ root });
  await generateContractCatalogue({ root, check: true });
  assert.equal(await readFile(sentinel, 'utf8'), 'keep this asset\n');
  await writeFile(join(root, cataloguePath), 'stale\n');
  await assert.rejects(
    generateContractCatalogue({ root, check: true }),
    /Contract catalogue is stale/,
  );
  assert.equal(await readFile(join(root, cataloguePath), 'utf8'), 'stale\n');
});
