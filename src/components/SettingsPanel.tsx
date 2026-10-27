import type { Copy } from "../i18n";
import { ASPECTS, type AspectKey, type QualityKey, type Settings } from "../types";

const ASPECT_KEYS: AspectKey[] = ["16:9", "9:16", "1:1"];
const QUALITY_KEYS: QualityKey[] = ["fast", "standard", "high"];

interface SettingsPanelProps {
  t: Copy["settings"];
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function SettingsPanel({ t, settings, onChange }: SettingsPanelProps) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{t.title}</h2>
      </div>

      <div className="field">
        <span className="field-label">{t.aspect}</span>
        <div className="segmented">
          {ASPECT_KEYS.map((key) => {
            const size = ASPECTS[key];
            return (
              <button
                key={key}
                type="button"
                className={settings.aspect === key ? "is-active" : ""}
                onClick={() => onChange({ aspect: key })}
              >
                <strong>{key}</strong>
                <span>
                  {size.width}×{size.height}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t.quality}</span>
        <div className="segmented">
          {QUALITY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={settings.quality === key ? "is-active" : ""}
              onClick={() => onChange({ quality: key })}
            >
              <strong>{t.qualityLabels[key]}</strong>
              <span>{t.qualityHints[key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t.seed}</span>
        <div className="input-row">
          <input
            value={settings.seed}
            inputMode="numeric"
            placeholder={t.seedPlaceholder}
            onChange={(event) => onChange({ seed: event.target.value.replace(/[^0-9]/g, "") })}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange({ seed: String(Math.floor(Math.random() * 1000000)) })}
          >
            {t.seedRandom}
          </button>
        </div>
      </div>

      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.translate}
          onChange={(event) => onChange({ translate: event.target.checked })}
        />
        <span>
          <strong>{t.autoTranslate}</strong>
          <small className="muted">{t.autoTranslateHint}</small>
        </span>
      </label>

      <details className="advanced">
        <summary>{t.advanced}</summary>
        <textarea
          value={settings.negative}
          onChange={(event) => onChange({ negative: event.target.value })}
          rows={2}
          placeholder={t.negative}
          spellCheck={false}
          lang="en"
        />
        <p className="muted tiny">{t.negativeHint}</p>
      </details>
    </section>
  );
}
