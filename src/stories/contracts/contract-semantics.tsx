import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyButton } from '@/components/copy-button';
import { PageHeader } from '@/patterns/page-header';
import source from '../../../docs/CONTRACTS.md?raw';
import { DocumentationLink } from './documentation-link';
import './contracts.css';

export function ContractSemantics() {
  return (
    <article className="contract-semantics contract-stack">
      <PageHeader
        title="What a contract means"
        description="Requirements, implementation, coverage and verification are separate responsibilities."
        actions={<CopyButton text={source} aria-label="Copy contract semantics documentation" />}
      />
      <p>
        Source: <code>docs/CONTRACTS.md</code>
      </p>
      <div className="contract-markdown">
        <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{ a: DocumentationLink }}>
          {source.replace(/^# [^\n]+\n/, '')}
        </Markdown>
      </div>
    </article>
  );
}
