# TokenInput experimental consolidation

Registry revision 2 discovers one TokenInput implementation at `@dimitriszoitas/aegis-agentic/agentic`, with component/contract version 2. The package remains experimental. The user authorized the next implementation/evaluation phase; an implementation agent resolved the behavior choices recorded in `decision.json`. No individual human behavior approval, stable promotion or public publication is claimed.

## Resolved behavior

The merged implementation preserves atomic batches and controlled state from both candidates, combines request correlation with monotonic draft revision checks, and exposes duplicate rejection by default with an explicit ignore variant and skipped-count feedback. Values are trimmed and normalized to NFC. Duplicate identity is JavaScript lowercase after normalization, not locale-specific collation.

Enter or Add commits. Shift+Enter inserts a line; lines and tabs separate batch values. Commas are ordinary text. Blank submissions do nothing. The native textarea preserves failed multiline batches exactly. Optional suggestions are named ordinary buttons, preserve unrelated drafts and do not limit free-text entry; this interface does not claim combobox navigation.

The host supplies an ordered array of unique committed values. Values are authoritative: the component never silently changes incoming props. Commit validation must return `null` or `undefined` to accept, or a nonempty string to reject. Exceptions and other return types reject the batch. Validation is synchronous.

## Synchronous consumer

```tsx
import { TokenInput } from '@dimitriszoitas/aegis-agentic/agentic';
const [labels, setLabels] = useState<string[]>([]);
<TokenInput label="Project labels" values={labels} onValuesChange={setLabels} />;
```

The default `confirmationMode="values"` clears the submitted draft after the host echoes the requested ordered values. It keeps existing synchronous React state consumers compatible. This mode does not identify asynchronous responses: use request mode for network-backed writes.

## Asynchronous consumer

Set `confirmationMode="request"` and pass an `acknowledgment` containing the callback's request ID and an accepted/rejected status. Acceptance requires both that acknowledgment and the ordered requested values. A rejected acknowledgment preserves the draft; a stale ID cannot settle a newer request. The component supplies an `AbortSignal`, aborts it when Keep editing cancels a request or the component unmounts, and suppresses new mutations while pending.

```tsx
<TokenInput
  label="Project labels"
  values={labels}
  confirmationMode="request"
  acknowledgment={acknowledgment}
  onValuesChange={(next, request) => {
    void saveLabels(next, { signal: request.signal }).then(
      () => {
        if (request.signal.aborted) return;
        setLabels(next);
        setAcknowledgment({ requestId: request.requestId, status: 'accepted' });
      },
      () => {
        if (request.signal.aborted) return;
        setAcknowledgment({ requestId: request.requestId, status: 'rejected' });
      },
    );
  }}
/>
```

The callback itself returns `void` or `false`, not a Promise. Returning `false` refuses immediately. A network failure must produce a rejected acknowledgment. An acknowledgment of acceptance without the corresponding value update remains pending. The host must discard cancelled work; the component cannot reverse an authoritative stale write or cancel a server-side mutation that already committed. Server concurrency control belongs to the consuming application.

## Changes from the previous reference component

- Default pasted commas no longer split batches. Use `commitKeys={['Enter', ',']}` to opt into comma delimiters, or convert CSV input in a dedicated importer before passing values.
- The editor is a textarea. Consumers should locate it by accessible name/role rather than an `input` tag or private CSS class.
- Suggestions are buttons rather than native datalist options. Their accepted value preserves an unrelated typed draft.
- Unicode NFC normalization and stable lowercase identity replace locale-dependent duplicate matching.
- Async consumers should adopt the request confirmation protocol above. Synchronous `onValuesChange={setLabels}` continues to work.
- Candidate A/B pure-model APIs are evidence fixtures, not supported public APIs. Neither is imported by the final implementation. Their sources and tests remain unchanged.

This is a breaking experimental behavior change, recorded in the 0.3 experimental package and contract version 2. Existing installed kits remain pinned. Run the consumer's own regression checks before opting into the new package/kit; no running service pin or application data is migrated by this contribution.

## Evidence and limits

`evidence.json` links the exact implementation hashes, source model checks, browser interaction/mode checks and a separately installed package consumer. Browser screenshots were inspected by an implementation agent. No human visual approval, full assistive-technology review, live network integration or production certification is implied. The original two models retain their historical assertions; `decision.json` identifies expectations that the consolidated contract intentionally supersedes.
