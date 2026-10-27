export type Lang = "km" | "en";

export type AspectKey = "16:9" | "9:16" | "1:1";
export type QualityKey = "fast" | "standard" | "high";
export type LengthKey = "single" | "15" | "30" | "60";

export type JobStatus = "queued" | "running" | "done" | "error";

/** Server-reported job stage keys (kept language-neutral). */
export type JobStage =
  | "queued"
  | "translating"
  | "loading_model"
  | "generating"
  | "encoding"
  | "done";

export interface ServerHealth {
  status: string;
  device: string;
  gpu: string | null;
  vram_gb: number | null;
  video_model: string;
  translate_model: string;
  torch: string;
  busy: boolean;
  queue_size: number;
  model_loaded: boolean;
}

export interface VideoJob {
  id: string;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  prompt: string;
  translated_prompt: string | null;
  negative_prompt: string;
  width: number;
  height: number;
  num_frames: number;
  frames_per_segment: number;
  segments_total: number;
  segments_done: number;
  duration_seconds: number | null;
  fps: number;
  num_inference_steps: number;
  seed: number | null;
  video_url: string | null;
  error: string | null;
  elapsed_seconds: number | null;
  created_at: number;
}

export interface TranslateResult {
  source_lang: string;
  translated_prompt: string;
  model: string;
  translated: boolean;
}

export interface GenerateRequest {
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  num_frames: number;
  duration_seconds?: number | null;
  num_inference_steps: number;
  guidance_scale?: number;
  seed?: number | null;
  translate?: boolean;
}

export interface Settings {
  aspect: AspectKey;
  quality: QualityKey;
  length: LengthKey;
  seed: string;
  negative: string;
  translate: boolean;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  translated: string | null;
  videoPath: string;
  createdAt: number;
  seed: number | null;
  width: number;
  height: number;
  numFrames: number;
}

export interface StoredServer {
  url: string;
  token: string;
}

export const ASPECTS: Record<AspectKey, { width: number; height: number }> = {
  "16:9": { width: 576, height: 320 },
  "9:16": { width: 320, height: 576 },
  "1:1": { width: 448, height: 448 },
};

export const QUALITIES: Record<QualityKey, { frames: number; steps: number }> = {
  fast: { frames: 16, steps: 20 },
  standard: { frames: 24, steps: 25 },
  high: { frames: 32, steps: 35 },
};
