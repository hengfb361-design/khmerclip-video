import { useEffect, useState } from "react";
import type { Copy } from "../i18n";
import type { ServerHealth } from "../types";

interface ConnectionCardProps {
  t: Copy["connection"];
  open: boolean;
  onToggle: () => void;
  initialUrl: string;
  initialToken: string;
  health: ServerHealth | null;
  busy: boolean;
  error: string | null;
  onConnect: (url: string, token: string) => void;
}

export function ConnectionCard({
  t,
  open,
  onToggle,
  initialUrl,
  initialToken,
  health,
  busy,
  error,
  onConnect,
}: ConnectionCardProps) {
  const [url, setUrl] = useState(initialUrl);
  const [token, setToken] = useState(initialToken);

  useEffect(() => setUrl(initialUrl), [initialUrl]);
  useEffect(() => setToken(initialToken), [initialToken]);

  return (
    <section className="card connection">
      <button type="button" className="card-head as-button" onClick={onToggle} aria-expanded={open}>
        <h2>{t.title}</h2>
        <span className={`status-text ${health ? "ok" : "off"}`}>
          <span className="dot" aria-hidden="true" />
          {health ? t.connected : t.disconnected}
        </span>
      </button>

      {open && (
        <form
          className="connection-body"
          onSubmit={(event) => {
            event.preventDefault();
            onConnect(url, token);
          }}
        >
          {!health && (
            <>
              <ol className="setup-list">
                {t.quickStart.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <pre className="snippet">
                <code>{t.snippet}</code>
              </pre>
            </>
          )}

          <label className="field">
            <span className="field-label">{t.url}</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t.urlPlaceholder}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>

          <label className="field">
            <span className="field-label">{t.token}</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={t.tokenPlaceholder}
              type="password"
              autoComplete="off"
            />
          </label>

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? t.connecting : t.connect}
          </button>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <p className="muted tiny">{t.hint}</p>
        </form>
      )}

      {health && (
        <>
          <p className="ok-hint">{t.okHint}</p>
          <dl className="meta meta-grid">
          <div>
            <dt>{t.gpu}</dt>
            <dd>{health.gpu ?? health.device}</dd>
          </div>
          <div>
            <dt>{t.vram}</dt>
            <dd>{health.vram_gb ? `${health.vram_gb} GB` : "—"}</dd>
          </div>
          <div>
            <dt>{t.model}</dt>
            <dd>{health.video_model}</dd>
          </div>
          <div>
            <dt>{t.queue}</dt>
            <dd>{health.queue_size}</dd>
          </div>
          </dl>
        </>
      )}
    </section>
  );
}
