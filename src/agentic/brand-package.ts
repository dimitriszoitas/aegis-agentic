import {
  compileProfile,
  configurations,
  validateProfile,
  type CompiledProfile,
  type DesignProfile,
  type ProfileIssue,
} from './profile';

/** JSON data only. Compatibility identifies the supported contract, not package provenance. */
export interface BrandPackage {
  kind: 'aegis-brand-package';
  version: 1;
  packageVersion: string;
  compatibility: {
    profileVersion: 1;
    compilerVersion: 1;
    tokenContractVersion: 1;
    configurations: string[];
  };
  profile: DesignProfile;
}
export interface ProfileChange {
  field: string;
  before: string | number;
  after: string | number;
}
export interface BrandPackagePreview {
  valid: boolean;
  issues: ProfileIssue[];
  package?: BrandPackage;
  compiled?: CompiledProfile;
  changes: ProfileChange[];
}

const record = (input: unknown): input is Record<string, unknown> =>
  !!input && typeof input === 'object' && !Array.isArray(input);
const packageKeys = ['kind', 'version', 'packageVersion', 'compatibility', 'profile'];
const compatibilityKeys = [
  'profileVersion',
  'compilerVersion',
  'tokenContractVersion',
  'configurations',
];

export function validateBrandPackage(input: unknown): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  const error = (code: string, message: string) =>
    issues.push({ code, message, severity: 'error' });
  if (!record(input))
    return [
      {
        code: 'brand-package-object',
        severity: 'error',
        message: 'A brand package must be a JSON object.',
      },
    ];
  for (const key of Object.keys(input))
    if (!packageKeys.includes(key))
      error('brand-package-field', `Unknown brand package field: ${key}.`);
  if (input.kind !== 'aegis-brand-package' || input.version !== 1)
    error('brand-package-version', 'Only Aegis brand package version 1 is supported.');
  if (
    typeof input.packageVersion !== 'string' ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(
      input.packageVersion,
    )
  )
    error(
      'brand-package-release',
      'packageVersion must use major.minor.patch with an optional prerelease suffix.',
    );
  if (!record(input.compatibility))
    error('brand-package-compatibility', 'Compatibility metadata is required.');
  else {
    for (const key of Object.keys(input.compatibility))
      if (!compatibilityKeys.includes(key))
        error('brand-package-field', `Unknown compatibility field: ${key}.`);
    for (const key of ['profileVersion', 'compilerVersion', 'tokenContractVersion'])
      if (input.compatibility[key] !== 1)
        error('brand-package-incompatible', `Unsupported ${key}; this build supports version 1.`);
    const modes = input.compatibility.configurations;
    if (
      !Array.isArray(modes) ||
      modes.length !== 4 ||
      new Set(modes).size !== 4 ||
      configurations.some((mode) => !modes.includes(mode))
    )
      error(
        'brand-package-configurations',
        'A brand must support exactly the four Aegis theme/mode configurations.',
      );
  }
  issues.push(...validateProfile(input.profile));
  return issues;
}

export function createBrandPackage(
  profile: DesignProfile,
  options: { packageVersion?: string } = {},
): BrandPackage {
  const result: BrandPackage = {
    kind: 'aegis-brand-package',
    version: 1,
    packageVersion: options.packageVersion ?? '1.0.0',
    compatibility: {
      profileVersion: 1,
      compilerVersion: 1,
      tokenContractVersion: 1,
      configurations: [...configurations],
    },
    profile: compileProfile(profile).profile,
  };
  const issues = validateBrandPackage(result).filter((issue) => issue.severity === 'error');
  if (issues.length) throw new Error(issues.map((issue) => issue.message).join(' '));
  return result;
}

/** Stable field order, normalized profile values, and no generated CSS or executable hooks. */
export function serializeBrandPackage(input: BrandPackage): string {
  const issues = validateBrandPackage(input).filter((issue) => issue.severity === 'error');
  if (issues.length) throw new Error(issues.map((issue) => issue.message).join(' '));
  return (
    JSON.stringify(
      createBrandPackage(input.profile, { packageVersion: input.packageVersion }),
      null,
      2,
    ) + '\n'
  );
}

export function compareProfiles(before: DesignProfile, after: DesignProfile): ProfileChange[] {
  const flatten = (profile: DesignProfile) => ({
    version: profile.version,
    id: profile.id,
    name: profile.name,
    brand: profile.brand,
    neutral: profile.neutral,
    radius: profile.radius,
    font: profile.font,
    density: profile.density,
    'semantic.success': profile.semantic.success,
    'semantic.warning': profile.semantic.warning,
    'semantic.danger': profile.semantic.danger,
    'semantic.info': profile.semantic.info,
  });
  const a = flatten(before),
    b = flatten(after);
  return (Object.keys(a) as (keyof typeof a)[])
    .filter((field) => a[field] !== b[field])
    .map((field) => ({ field, before: a[field], after: b[field] }));
}

/** Validation and compilation are a preview only. Callers explicitly choose whether to save/apply. */
export function previewBrandPackage(
  input: unknown,
  currentProfile: DesignProfile,
): BrandPackagePreview {
  const issues = [...validateBrandPackage(input), ...validateProfile(currentProfile)];
  if (issues.some((issue) => issue.severity === 'error'))
    return { valid: false, issues, changes: [] };
  try {
    const pkg = createBrandPackage((input as BrandPackage).profile, {
      packageVersion: (input as BrandPackage).packageVersion,
    });
    const compiled = compileProfile(pkg.profile);
    return {
      valid: true,
      issues: [...issues, ...compiled.issues],
      package: pkg,
      compiled,
      changes: compareProfiles(compileProfile(currentProfile).profile, compiled.profile),
    };
  } catch (error) {
    return {
      valid: false,
      issues: [
        ...issues,
        {
          code: 'brand-package-compile',
          severity: 'error',
          message: error instanceof Error ? error.message : 'Brand compilation failed.',
        },
      ],
      changes: [],
    };
  }
}
