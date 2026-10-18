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

/** Stateless rendering of the copy button so each state (idle, copied, failed) can be checked by server rendering.
 *  `fallbackText` is the text to show for hand-copying when the clipboard refuses and the text is not already on
 *  the page (the request bodies on the landing cards); without it the failed state points at the visible snippet. */
export function CopyButtonView({ state, label, onCopy, fallbackText }: { state: CopyState; label: string; onCopy?: () => void; fallbackText?: string }) {
  const failed = state === 'failed';
  // The box appears only after a failed click, so it takes focus and selects its text as it mounts: a keyboard or
  // screen-reader visitor lands on the request instead of hunting for it, and Ctrl/Cmd+C works at once. A callback
  // ref runs once per mount and nowhere on the server, where the box is never in the failed state anyway.
  const focusOnMount = (box: HTMLTextAreaElement | null) => {
    if (!box) return;
    box.focus();
    box.select();
  };
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${failed && fallbackText ? 'basis-full' : ''}`}>
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
      {failed && (
        <span role="status" data-testid="copy-failed" className="mono-label text-xs text-muted-foreground">
          {fallbackText ? 'copy failed - select the text below and copy it manually' : 'copy failed - select the command and copy it manually'}
        </span>
      )}
      {failed && fallbackText ? (
        <textarea
          readOnly
          value={fallbackText}
          rows={Math.min(8, fallbackText.split('\n').length)}
          aria-label={`${label} by hand`}
          data-testid="copy-fallback"
          ref={focusOnMount}
          onFocus={(e) => e.currentTarget.select()}
          className="mono-label basis-full rounded-md border border-border bg-background/50 p-2 text-xs text-foreground"
        />
      ) : null}
    </span>
  );
}

/** One-click copy for a command snippet: shows "copied" for two seconds; when the clipboard API is missing or refused it says so and points the reader at the text to select by hand. */
export function CopyButton({ text, label, fallback = false }: { text: string; label: string; fallback?: boolean }) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    const next = copyStateFor(await copyText(text));
    setState(next);
    clearTimeout(timer.current);
    if (next === 'copied') timer.current = setTimeout(() => setState('idle'), 2000);
  };
  return <CopyButtonView state={state} label={label} onCopy={copy} fallbackText={fallback ? text : undefined} />;
}
