/** One generated source for human docs and read-only agent discovery. No certification inference. */
import data from '../../public/ai/contract-catalogue.json';

export type ContractSource = { readonly path: string; readonly sha256: string };
export type ContractCheck = ContractSource & { readonly label: string; readonly scope: string };
export type ContractEvidence = ContractCheck & {
  readonly reportedStatus: string | null;
  readonly sourceMatch: 'not-assessed' | 'matches-declared-source-hashes' | 'mismatch';
};
export type ContractEntry = {
  readonly id: string;
  readonly name: string;
  readonly kind: 'component' | 'pattern' | 'foundation' | 'protocol';
  readonly apiFamilyId: string | null;
  readonly registryId: string | null;
  readonly summary: string;
  readonly aliases: readonly string[];
  readonly importPaths: readonly string[];
  readonly api: { readonly source: ContractSource; readonly url: string } | null;
  readonly contract: {
    readonly id: string;
    readonly version: number | null;
    readonly status: string;
    readonly source: ContractSource;
    readonly document: Readonly<Record<string, unknown>>;
    readonly raw: string;
  } | null;
  readonly checks: readonly ContractCheck[];
  readonly evidence: readonly ContractEvidence[];
  readonly coverage: {
    readonly apiDocumented: boolean;
    readonly behaviorAuthored: boolean;
    readonly systemContractAuthored: boolean;
    readonly checksLinked: boolean;
    readonly evidenceLinked: boolean;
    readonly evidenceReported: boolean;
  };
  readonly limitations: readonly string[];
};
export type ContractCoverage = {
  readonly apiFamilies: number;
  readonly apiFamiliesWithAuthoredBehavior: number;
  readonly apiFamiliesWithoutAuthoredBehavior: number;
  readonly authoredComponentPatternContracts: number;
  readonly authoredOnlyEntries: number;
  readonly systemProtocolContracts: number;
  readonly entriesWithLinkedChecks: number;
  readonly entriesWithLinkedEvidence: number;
  readonly entriesWithReportedEvidence: number;
};
export type ContractCatalogue = {
  readonly schemaVersion: 1;
  readonly package: { readonly name: string; readonly version: string };
  readonly registryRevision: number;
  readonly sourceDigest: string;
  readonly sources: readonly ContractSource[];
  readonly entries: readonly ContractEntry[];
  readonly coverage: ContractCoverage;
  readonly limitations: readonly string[];
};
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const contractCatalogue: ContractCatalogue = freeze(data as unknown as ContractCatalogue);

/** Accepts a catalogue/API-family identity or its explicitly mapped registry/contract identity. */
export function getContractEntry(idOrApiFamilyId: string): ContractEntry | undefined {
  if (typeof idOrApiFamilyId !== 'string')
    throw new TypeError('Contract identity must be a string');
  const id = idOrApiFamilyId.trim().toLowerCase();
  return contractCatalogue.entries.find((entry) =>
    [entry.id, entry.apiFamilyId, entry.registryId, entry.contract?.id].some(
      (value) => value === id,
    ),
  );
}

/** All terms must match curated identity, purpose, capability aliases or import paths. */
export function searchContracts(query: string): ContractEntry[] {
  if (typeof query !== 'string') throw new TypeError('Contract query must be a string');
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return contractCatalogue.entries.filter((entry) => {
    const text = [
      entry.id,
      entry.name,
      entry.kind,
      entry.apiFamilyId,
      entry.registryId,
      entry.summary,
      ...entry.aliases,
      ...entry.importPaths,
    ]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
export function getContractCoverage(): ContractCoverage {
  return contractCatalogue.coverage;
}
