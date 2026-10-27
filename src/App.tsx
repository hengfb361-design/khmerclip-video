import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "./components/Composer";
import { ConnectionCard } from "./components/ConnectionCard";
import { History } from "./components/History";
import { SettingsPanel } from "./components/SettingsPanel";
import { Stage } from "./components/Stage";
import { copyFor } from "./i18n";
import {
  ApiError,
  createJob,
  getHealth,
  getJob,
  normalizeBaseUrl,
  translatePrompt,
  type Client,
} from "./lib/api";
import {
  DEFAULT_SETTINGS,
  loadHistory,
  loadLang,
  loadServer,
  loadSettings,
  saveHistory,
  saveLang,
  saveServer,
  saveSettings,
} from "./lib/storage";
import {
  ASPECTS,
  QUALITIES,
  type HistoryItem,
  type Lang,
  type ServerHealth,
  type Settings,
  type StoredServer,
  type VideoJob,
} from "./types";

const POLL_INTERVAL_MS = 1500;

export default function App() {
  const [lang, setLang] = useState<Lang>(loadLang);
  const t = copyFor(lang);

  const [server, setServer] = useState<StoredServer>(loadServer);
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  // Open the connection form straight away on a first visit with no saved server.
  const [showConnection, setShowConnection] = useState(() => loadServer().url.length === 0);

  const [prompt, setPrompt] = useState("");
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...loadSettings(),
  }));
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const [job, setJob] = useState<VideoJob | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);

  const pollRef = useRef<number | null>(null);
  const bootChecked = useRef(false);

  const client: Client = { baseUrl: server.url, token: server.token };
  const hasServer = server.url.length > 0;
  const generating = job?.status === "queued" || job?.status === "running";

  useEffect(() => saveLang(lang), [lang]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveHistory(history), [history]);
  useEffect(
    () => () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    },
    [],
  );

  const describeError = useCallback(
    (error: unknown): string => {
      if (error instanceof ApiError) {
        return error.status === 0 ? t.errors.network : error.message;
      }
      return String(error);
    },
    [t.errors.network],
  );

  const checkHealth = useCallback(
    async (target: StoredServer, quiet = false): Promise<boolean> => {
      const baseUrl = normalizeBaseUrl(target.url);
      if (!baseUrl) {
        setHealth(null);
        setHealthError(t.connection.needUrl);
        return false;
      }
      // A https page cannot call an http API (mixed content), except on localhost.
      if (
        window.location.protocol === "https:" &&
        baseUrl.startsWith("http://") &&
        !/^http:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl)
      ) {
        setHealth(null);
        setHealthError(t.errors.https);
        return false;
      }
      setHealthBusy(true);
      if (!quiet) setHealthError(null);
      try {
        const result = await getHealth({ baseUrl, token: target.token });
        setHealth(result);
        setHealthError(null);
        setServer({ url: baseUrl, token: target.token });
        saveServer({ url: baseUrl, token: target.token });
        return true;
      } catch (error) {
        setHealth(null);
        setHealthError(describeError(error));
        return false;
      } finally {
        setHealthBusy(false);
      }
    },
    [describeError, t.connection.needUrl, t.errors.https],
  );

  useEffect(() => {
    if (bootChecked.current) return;
    bootChecked.current = true;
    if (server.url) void checkHealth(server, true);
    // Only runs once on mount with the stored server URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = useCallback(
    async (url: string, token: string) => {
      setJobError(null);
      const ok = await checkHealth({ url, token });
      if (ok) setShowConnection(false);
    },
    [checkHealth],
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (active: Client, jobId: string) => {
      stopPolling();
      pollRef.current = window.setInterval(() => {
        void (async () => {
          try {
            const next = await getJob(active, jobId);
            setJob(next);

            if (next.status !== "done" && next.status !== "error") return;
            stopPolling();

            if (next.status === "error") {
              setJobError(next.error ?? null);
              return;
            }
            const videoPath = next.video_url;
            if (!videoPath) return;
            setHistory((previous) =>
              [
                {
                  id: next.id,
                  prompt: next.prompt,
                  translated: next.translated_prompt,
                  videoPath,
                  createdAt: next.created_at,
                  seed: next.seed,
                  width: next.width,
                  height: next.height,
                  numFrames: next.num_frames,
                },
                ...previous.filter((item) => item.id !== next.id),
              ].slice(0, 24),
            );
          } catch (error) {
            stopPolling();
            setJobError(error instanceof ApiError ? error.message : String(error));
          }
        })();
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const baseUrl = normalizeBaseUrl(server.url);
    if (!baseUrl) {
      setShowConnection(true);
      setHealthError(t.connection.needUrl);
      return;
    }

    const active: Client = { baseUrl, token: server.token };
    const aspect = ASPECTS[settings.aspect];
    const quality = QUALITIES[settings.quality];
    const seedText = settings.seed.trim();
    const seed = seedText ? Number(seedText) : null;

    setJobError(null);
    setTranslation(null);
    try {
      if (
        window.location.protocol === "https:" &&
        baseUrl.startsWith("http://") &&
        !/^http:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl)
      ) {
        setJobError(t.errors.https);
        return;
      }
      const created = await createJob(active, {
        prompt: trimmed,
        negative_prompt: settings.negative.trim() || undefined,
        width: aspect.width,
        height: aspect.height,
        num_frames: quality.frames,
        num_inference_steps: quality.steps,
        seed: seed !== null && Number.isFinite(seed) ? seed : null,
        translate: settings.translate,
      });
      setJob(created);
      startPolling(active, created.id);
    } catch (error) {
      setJobError(describeError(error));
    }
  }, [describeError, prompt, server, settings, startPolling, t.connection.needUrl, t.errors.https]);

  const handleTranslate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const baseUrl = normalizeBaseUrl(server.url);
    if (!baseUrl) {
      setShowConnection(true);
      return;
    }
    setTranslating(true);
    setJobError(null);
    try {
      const result = await translatePrompt({ baseUrl, token: server.token }, trimmed);
      setTranslation(result.translated_prompt);
    } catch (error) {
      setJobError(describeError(error));
    } finally {
      setTranslating(false);
    }
  }, [describeError, prompt, server]);

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
    setTranslation(null);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22">
              <rect x="2" y="6" width="28" height="20" rx="5" fill="currentColor" opacity="0.22" />
              <path d="M13 11.5 22 16l-9 4.5z" fill="currentColor" />
            </svg>
          </span>
          <span className="brand-text">
            <strong>{t.brand}</strong>
            <small>{t.tagline}</small>
          </span>
        </div>

        <div className="header-actions">
          <div className="lang-switch" role="group" aria-label={t.langLabel}>
            <button
              type="button"
              className={lang === "km" ? "is-active" : ""}
              onClick={() => setLang("km")}
            >
              ខ្មែរ
            </button>
            <button
              type="button"
              className={lang === "en" ? "is-active" : ""}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            className={`status-pill ${health ? "is-ok" : "is-off"}`}
            onClick={() => setShowConnection((value) => !value)}
          >
            <span className="dot" aria-hidden="true" />
            {healthBusy ? t.statusChecking : health ? t.statusConnected : t.statusDisconnected}
          </button>
        </div>
      </header>

      <p className="hero-kicker">{t.heroKicker}</p>

      {!hasServer && (
        <div className="banner">
          <div>
            <strong>{t.bannerTitle}</strong>
            <p>{t.bannerText}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setShowConnection(true)}>
            {t.bannerBtn}
          </button>
        </div>
      )}

      <main className="layout">
        <div className="column">
          <Composer
            t={t.composer}
            prompt={prompt}
            translation={translation}
            translating={translating}
            generating={generating}
            hasServer={hasServer}
            onPromptChange={handlePromptChange}
            onTranslate={() => void handleTranslate()}
            onGenerate={() => void handleGenerate()}
            onClear={() => {
              setPrompt("");
              setTranslation(null);
            }}
          />

          <SettingsPanel
            t={t.settings}
            settings={settings}
            onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))}
          />

          <ConnectionCard
            t={t.connection}
            open={showConnection}
            onToggle={() => setShowConnection((value) => !value)}
            initialUrl={server.url}
            initialToken={server.token}
            health={health}
            busy={healthBusy}
            error={healthError}
            onConnect={(url, token) => void handleConnect(url, token)}
          />
        </div>

        <div className="column">
          <Stage
            t={t.stage}
            job={job}
            jobError={jobError}
            client={client}
            hasServer={hasServer}
            onConnect={() => setShowConnection(true)}
          />
          <History
            t={t.history}
            items={history}
            client={client}
            hasServer={hasServer}
            onClear={() => setHistory([])}
          />
        </div>
      </main>

      <footer className="footer">
        <p className="muted tiny">{t.footerNote}</p>
      </footer>
    </div>
  );
}
