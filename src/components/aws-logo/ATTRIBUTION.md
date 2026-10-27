# AWS architecture artwork

Source: [AWS architecture icons](https://aws.amazon.com/architecture/icons/).

Package: [July 31, 2026 icon release](https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip), retrieved October 6, 2026.

The assets are AWS architecture service, category, resource, and group symbols. They are not a claim to include every AWS corporate or marketing logo. AWS permits use of these assets in architecture diagrams and related materials; see the source page for current usage guidance. AWS names, artwork, and marks remain owned by Amazon Web Services. The repository's MIT license does not transfer ownership of third-party marks or imply AWS endorsement.

## Included artwork

| Kind                                  | Symbols |
| ------------------------------------- | ------: |
| Service marks                         |     305 |
| Category marks                        |      26 |
| Resource symbols                      |     466 |
| Standalone architecture-group symbols |      13 |
| Total                                 |     810 |

There are 303 distinct service names. AWS Compute Optimizer and Amazon Kinesis Video Streams each have a second official category-colored mark, retained separately. Service/category size duplicates are reduced to the largest provided SVG (64); resources retain their supplied 48 size and group marks their supplied 32 size. The 49 official light/dark pairs share one catalog entry, giving 859 SVG assets overall.

All SVGs are copied byte-for-byte, preserving AWS colors, paths, and viewboxes. The component applies a square, rounded external frame and uses official dark variants where provided. `manifest.json` records the package URL, release, original paths, selected sizes, variants, and counts. `asset-checksums.json` records SHA-256 hashes for the copied files. PNG duplicates and operating-system metadata are omitted.

## Component usage

```tsx
import { AwsLogo, type AwsLogoName } from '@/components/aws-logo';

const service: AwsLogoName = 'service-amazon-ec2';
<AwsLogo name={service} size={48} />;
```

Use `decorative` when adjacent visible text already names the service. The default accessible name comes from the source catalog. `getAwsLogoUrl(name, theme)` returns the bundled original SVG URL for downloads and non-React consumers; deployment base paths are handled by Vite.
