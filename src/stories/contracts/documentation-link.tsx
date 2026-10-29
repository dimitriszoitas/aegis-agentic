import type { ReactNode } from 'react';

/** Source documents also render in a static site without the repository tree. */
export function DocumentationLink({ href, children }: { href?: string; children?: ReactNode }) {
  if (!href) return <span>{children}</span>;
  if (/^(?:\.\.?\/)*(?:docs\/)?CONTRACTS\.md$/.test(href)) {
    return (
      <a href="./?path=/docs/aegis-contract-semantics--docs" target="_top">
        {children}
      </a>
    );
  }
  const publicJson = href.match(/^(?:\.\.\/)*public\/(ai\/[\w./-]+\.json)$/);
  if (publicJson) return <a href={`./${publicJson[1]}`}>{children}</a>;
  if (/^(?:https?:\/\/|#)/.test(href)) return <a href={href}>{children}</a>;
  // A source reference is not a promise that the file is published over HTTP.
  return <span title={`Repository source: ${href}`}>{children}</span>;
}
