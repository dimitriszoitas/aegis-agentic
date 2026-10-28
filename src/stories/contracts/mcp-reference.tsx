import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyButton } from '@/components/copy-button';
import { PageHeader } from '@/patterns/page-header';
import source from '../../../docs/MCP.md?raw';
import './contracts.css';

export function McpReference() {
  return (
    <article className="contract-mcp contract-stack">
      <PageHeader
        title="MCP integration"
        description="Source-backed setup, capabilities and operating boundaries."
        actions={<CopyButton text={source} aria-label="Copy MCP documentation" />}
      />
      <p>
        Source: <code>docs/MCP.md</code>
      </p>
      <div className="contract-markdown">
        <Markdown remarkPlugins={[remarkGfm]} skipHtml>
          {source.replace(/^# [^\n]+\n/, '')}
        </Markdown>
      </div>
    </article>
  );
}
