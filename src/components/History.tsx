import type { Copy } from "../i18n";
import { mediaUrl, type Client } from "../lib/api";
import type { HistoryItem } from "../types";

interface HistoryProps {
  t: Copy["history"];
  items: HistoryItem[];
  client: Client;
  hasServer: boolean;
  onClear: () => void;
}

export function History({ t, items, client, hasServer, onClear }: HistoryProps) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{t.title}</h2>
        {items.length > 0 && (
          <button type="button" className="link-btn" onClick={onClear}>
            {t.clearAll}
          </button>
        )}
      </div>

      {items.length === 0 && <p className="muted small">{t.empty}</p>}

      {items.length > 0 && (
        <div className="history-grid">
          {items.map((item) => (
            <figure className="history-item" key={item.id}>
              {hasServer ? (
                <video src={mediaUrl(client, item.videoPath)} controls preload="metadata" playsInline />
              ) : (
                <div className="history-placeholder" />
              )}
              <figcaption>
                <p title={item.prompt}>{item.prompt}</p>
                <span className="muted tiny">
                  {item.width}×{item.height} · {item.numFrames}f ·{" "}
                  {new Date(item.createdAt * 1000).toLocaleTimeString()}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {items.length > 0 && !hasServer && <p className="notice">{t.needServer}</p>}
    </section>
  );
}
