// Headless smoke test for the API client the website uses when a server URL
// is entered. Runs the real src/lib/api.ts against a mock KhmerClip server.
//
//   node scripts/api-smoke.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  ApiError,
  createJob,
  getHealth,
  getJob,
  mediaUrl,
  normalizeBaseUrl,
  translatePrompt,
} from "../src/lib/api.ts";

const TOKEN = "smoke-token";
const baseJob = {
  id: "abc123",
  status: "queued",
  stage: "queued",
  progress: 0,
  prompt: "ព្រះអាទិត្យរះនៅអង្គរវត្ត",
  translated_prompt: null,
  negative_prompt: "",
  width: 576,
  height: 320,
  num_frames: 25,
  fps: 24,
  num_inference_steps: 25,
  seed: 7,
  video_url: null,
  error: null,
  elapsed_seconds: null,
  created_at: 1700000000,
};

let polls = 0;
const seen = [];

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://127.0.0.1");
  const json = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  seen.push({ method: req.method, pathname, token: req.headers["x-api-token"] });

  if (pathname === "/api/health") {
    return json(200, {
      service: "khmerclip-video",
      status: "ok",
      device: "cuda",
      gpu: "Tesla T4",
      vram_gb: 15.6,
      profile: "ltx",
      profile_label: "LTX-Video 2B",
      video_model: "Lightricks/LTX-Video",
      translate_model: "facebook/nllb-200-distilled-600M",
      fps: 24,
      max_frames: 161,
      torch: "2.5.1",
      busy: false,
      queue_size: 0,
      model_loaded: true,
    });
  }

  if (req.headers["x-api-token"] !== TOKEN) {
    return json(401, { detail: "Invalid or missing API token" });
  }

  if (pathname === "/api/translate") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || "{}");
    return json(200, {
      source_lang: "khm_Khmr",
      translated_prompt: "sunrise at Angkor Wat",
      model: "mock",
      translated: true,
      echo: body.text,
    });
  }

  if (pathname === "/api/generate") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || "{}");
    assert.equal(body.prompt, baseJob.prompt, "generate must forward the prompt");
    assert.equal(body.num_frames, 25, "generate must forward frame count");
    return json(200, baseJob);
  }

  if (pathname.startsWith("/api/jobs/")) {
    polls += 1;
    if (polls < 2) {
      return json(200, { ...baseJob, status: "running", stage: "generating", progress: 55 });
    }
    return json(200, {
      ...baseJob,
      status: "done",
      stage: "done",
      progress: 100,
      translated_prompt: "sunrise at Angkor Wat",
      video_url: "/api/videos/abc123.mp4",
      elapsed_seconds: 42,
    });
  }

  return json(404, { detail: "not found" });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const client = { baseUrl: `http://127.0.0.1:${port}`, token: TOKEN };

try {
  assert.equal(normalizeBaseUrl("  abc.trycloudflare.com/ "), "https://abc.trycloudflare.com");
  assert.equal(normalizeBaseUrl("http://localhost:8002"), "http://localhost:8002");
  assert.equal(normalizeBaseUrl(""), "");

  const health = await getHealth(client);
  assert.equal(health.gpu, "Tesla T4");
  assert.equal(health.profile, "ltx");

  const translation = await translatePrompt(client, baseJob.prompt);
  assert.equal(translation.translated_prompt, "sunrise at Angkor Wat");

  const created = await createJob(client, {
    prompt: baseJob.prompt,
    width: 576,
    height: 320,
    num_frames: 25,
    num_inference_steps: 25,
  });
  assert.equal(created.id, "abc123");

  const running = await getJob(client, created.id);
  assert.equal(running.status, "running");
  assert.equal(running.progress, 55);

  const finished = await getJob(client, created.id);
  assert.equal(finished.status, "done");
  assert.ok(finished.video_url);
  assert.match(mediaUrl(client, finished.video_url), /token=smoke-token$/);
  assert.equal(
    mediaUrl({ baseUrl: client.baseUrl, token: "" }, "/api/videos/a.mp4"),
    `${client.baseUrl}/api/videos/a.mp4`,
  );

  // /api/health is public by design; protected routes must reject a bad token.
  await assert.rejects(
    () => translatePrompt({ baseUrl: client.baseUrl, token: "wrong" }, "សួស្តី"),
    (error) => error instanceof ApiError && error.status === 401 && /token/i.test(error.message),
  );
  await assert.rejects(
    () => getJob({ baseUrl: client.baseUrl, token: "" }, "abc123"),
    (error) => error instanceof ApiError && error.status === 401,
  );

  assert.ok(
    seen.some((entry) => entry.pathname === "/api/health" && entry.token === TOKEN),
    "token header must be sent",
  );

  console.log("api-client smoke test passed ✅  (health, translate, generate, poll, media url, 401)");
} finally {
  server.close();
}
