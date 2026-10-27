import type { Copy } from "../i18n";

interface ComposerProps {
  t: Copy["composer"];
  prompt: string;
  /** Shown when the user separated several prompts with newlines (Flow-style scenes). */
  flowNote: string | null;
  translation: string | null;
  translating: boolean;
  generating: boolean;
  hasServer: boolean;
  onPromptChange: (value: string) => void;
  onTranslate: () => void;
  onGenerate: () => void;
  onClear: () => void;
}

export function Composer({
  t,
  prompt,
  flowNote,
  translation,
  translating,
  generating,
  hasServer,
  onPromptChange,
  onTranslate,
  onGenerate,
  onClear,
}: ComposerProps) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{t.label}</h2>
        <span className="pill-count">
          {t.chars} {prompt.length}
        </span>
      </div>
      <p className="muted small">{t.hint}</p>

      <textarea
        className="prompt-input"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder={t.placeholder}
        rows={5}
        maxLength={1200}
        spellCheck={false}
      />

      {flowNote && <p className="flow-note">{flowNote}</p>}

      <div className="chips">
        <span className="chips-label">{t.examplesLabel}</span>
        {t.examples.map((example) => (
          <button key={example} type="button" className="chip" onClick={() => onPromptChange(example)}>
            {example.length > 44 ? `${example.slice(0, 44)}…` : example}
          </button>
        ))}
      </div>

      {translation && (
        <div className="translation">
          <span className="translation-label">{t.translated}</span>
          <p lang="en">{translation}</p>
        </div>
      )}

      <div className="composer-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onTranslate}
          disabled={!prompt.trim() || translating || !hasServer}
        >
          {translating ? t.translating : t.translate}
        </button>
        <div className="spacer" />
        {prompt.length > 0 && (
          <button type="button" className="link-btn" onClick={onClear}>
            {t.clear}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={onGenerate}
          disabled={!prompt.trim() || generating}
        >
          {generating ? t.generating : t.generate}
        </button>
      </div>

      {!hasServer && <p className="notice">{t.needServer}</p>}
    </section>
  );
}
