import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** Write `text` to the clipboard; resolves true when the browser accepted it, false when the API is missing or refused. */
export async function copyText(text: string): Promise<boolean> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard?.writeText) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type CopyState = 'idle' | 'copied' | 'failed';

/** Pick the next button state from the clipboard result: a refused or missing clipboard API becomes `failed`, never a silent no-op. */
export function copyStateFor(accepted: boolean): CopyState {
  return accepted ? 'copied' : 'failed';
}

/** Stateless rendering of the copy button so each state (idle, copied, failed) can be checked by server rendering. */
export function CopyButtonView({ state, label, onCopy }: { state: CopyState; label: string; onCopy?: () => void }) {
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onCopy}
        aria-label={label}
        title={label}
        data-testid="copy-button"
        data-copied={state === 'copied' ? 'true' : 'false'}
        data-copy-state={state}
        className="mono-label inline-flex items-center gap-1 rounded-md border border-border bg-background/50 px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {state === 'copied' ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
        {state === 'copied' ? 'copied' : state === 'failed' ? 'retry' : 'copy'}
      </button>
      {state === 'failed' && (
        <span role="status" data-testid="copy-failed" className="mono-label text-xs text-muted-foreground">
          copy failed - select the command and copy it manually
        </span>
      )}
    </span>
  );
}

/** One-click copy for a command snippet: shows "copied" for two seconds; when the clipboard API is missing or refused it says so and points the reader at the text to select by hand. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    const next = copyStateFor(await copyText(text));
    setState(next);
    clearTimeout(timer.current);
    if (next === 'copied') timer.current = setTimeout(() => setState('idle'), 2000);
  };
  return <CopyButtonView state={state} label={label} onCopy={copy} />;
}
