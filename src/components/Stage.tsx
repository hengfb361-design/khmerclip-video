import type { Copy } from "../i18n";
import { mediaUrl, type Client } from "../lib/api";
import type { JobStage, VideoJob } from "../types";

interface StageProps {
  t: Copy["stage"];
  job: VideoJob | null;
  jobError: string | null;
  client: Client;
  hasServer: boolean;
  onConnect: () => void;
}

export function Stage({ t, job, jobError, client, hasServer, onConnect }: StageProps) {
  const running = job?.status === "queued" || job?.status === "running";
  const videoSrc = job?.video_url ? mediaUrl(client, job.video_url) : "";
  const done = job?.status === "done" && videoSrc.length > 0;

  const stageLabels: Record<JobStage, string> = {
    queued: t.queued,
    translating: t.translating,
    loading_model: t.loading,
    generating: t.generating,
    encoding: t.encoding,
    done: t.done,
  };

  return (
    <section className="card stage-card">
      <div className="card-head">
        <h2>{t.title}</h2>
        {done && <span className="badge">{t.done}</span>}
        {running && (
          <span className="badge badge-live">
            <span className="spinner" aria-hidden="true" />
            {t.live}
          </span>
        )}
      </div>

      {jobError && (
        <div className="alert" role="alert">
          <strong>{t.errorTitle}</strong>
          <span>{jobError}</span>
        </div>
      )}

      {!job && (
        <div className="stage-empty">
          <div className="film" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <span key={index} />
            ))}
          </div>
          <h3>{t.emptyTitle}</h3>
          <p className="muted small">{t.emptyText}</p>
          <ol className="steps">
            <li>{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
          </ol>
          {!hasServer && (
            <button type="button" className="btn btn-primary" onClick={onConnect}>
              {t.connectBtn}
            </button>
          )}
        </div>
      )}

      {job && running && (
        <div className="stage-progress">
          <div className="progress-head">
            <span className="spinner" aria-hidden="true" />
            <strong>{stageLabels[job.stage]}</strong>
            <span className="pct">{job.progress}%</span>
          </div>
          <div className="bar">
            <span style={{ width: `${Math.min(100, Math.max(4, job.progress))}%` }} />
          </div>
          <p className="muted small">{t.waitHint}</p>
          {job.translated_prompt && (
            <div className="translation">
              <span className="translation-label">{t.translatedUsed}</span>
              <p lang="en">{job.translated_prompt}</p>
            </div>
          )}
          <p className="prompt-echo">“{job.prompt}”</p>
        </div>
      )}

      {job && done && (
        <>
          <div className="video-wrap">
            <video key={job.id} src={videoSrc} controls autoPlay loop playsInline />
          </div>
          <dl className="meta">
            <div>
              <dt>{t.dimensions}</dt>
              <dd>
                {job.width}×{job.height}
              </dd>
            </div>
            <div>
              <dt>{t.frames}</dt>
              <dd>
                {job.num_frames} · {job.fps} fps
              </dd>
            </div>
            <div>
              <dt>{t.seed}</dt>
              <dd>{job.seed ?? "—"}</dd>
            </div>
            <div>
              <dt>{t.elapsed}</dt>
              <dd>{job.elapsed_seconds ? `${job.elapsed_seconds.toFixed(0)}s` : "—"}</dd>
            </div>
          </dl>
          {job.translated_prompt && (
            <div className="translation">
              <span className="translation-label">{t.translatedUsed}</span>
              <p lang="en">{job.translated_prompt}</p>
            </div>
          )}
          <div className="stage-actions">
            <a className="btn btn-primary" href={videoSrc} target="_blank" rel="noreferrer">
              {t.download}
            </a>
            <a className="btn btn-ghost" href={videoSrc} target="_blank" rel="noreferrer">
              {t.openTab}
            </a>
          </div>
        </>
      )}

      {job?.status === "error" && (
        <div className="alert" role="alert">
          <strong>{t.errorTitle}</strong>
          <span>{job.error ?? t.errorBody}</span>
        </div>
      )}
    </section>
  );
}
