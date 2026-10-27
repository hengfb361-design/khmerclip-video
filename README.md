# KhmerClip — បង្កើតវីដេអូពីអក្សរខ្មែរ (Text → Video)

Website សម្រាប់បង្កើតវីដេអូខ្លីៗពី **prompt ភាសាខ្មែរ**។ AI បកប្រែ prompt ជាភាសាអង់គ្លេស
ដោយស្វ័យប្រវត្តិ រួចបង្កើតវីដេអូដោយ text-to-video diffusion model ដែលដំណើរការលើ
**NVIDIA T4 GPU (Google Colab, 16 GB VRAM)**។

```
Prompt ខ្មែរ  ──►  NLLB-200 (បកប្រែ)  ──►  zeroscope v2 576w  ──►  MP4
```

## អ្វីដែលមានក្នុង project

| Path | ការពិពណ៌នា |
| --- | --- |
| `src/` | Website (React + Vite + TypeScript) — ជា static app សុទ្ធ |
| `server/colab_server.py` | FastAPI server ដែលដំណើរការ AI model លើ GPU |
| `server/colab_t4_server.ipynb` | Colab notebook ដែលដាក់ server ចូល T4 (self-contained) |
| `server/requirements.txt` | Python dependencies សម្រាប់ server |
| `server/make_notebook.py` | Regenerate notebook ពី server code |
| `tools/video-colab/colab-start.sh` | បញ្ជាតែមួយ — ទាញ model + បើក API + tunnel |

Website ត្រូវការ **តែ URL** របស់ server ប៉ុណ្ណោះ — មិនមាន backend ផ្ទាល់ខ្លួនទេ ដូច្នេះអាច
host នៅ GitHub Pages / Netlify / Vercel / Cloudflare បានដោយផ្ទាល់។

## ១. បញ្ជាតែមួយ (one-liner) — ណែនាំ

ដាក់ឯកសារ ២ ក្នុង repo របស់អ្នក (ដូច tools/demucs-colab ដែរ)៖

```
tools/video-colab/colab-start.sh    ← ឯកសារនេះ
 tools/video-colab/colab_server.py  ← ចម្លងពី server/colab_server.py
```

បន្ទាប់មកក្នុង Colab/Kaggle cell មួយ (runtime ត្រូវមាន GPU)៖

```bash
!curl -fsSL https://raw.githubusercontent.com/kitreaksa78-debug/Sal/main/tools/video-colab/colab-start.sh | sh
```

Script នេះនឹង៖ ពិនិត្យ GPU → ដំឡើង libraries → ទាញ `colab_server.py` →
បង្កើត API token → **ទាញយក model (~១៥–២០ GB)** → បើក API នៅ port 8002 →
បើក cloudflared tunnel → បង្ហាញ **URL + API key + endpoints**។

រួចចម្លង URL និង token ទៅកាត «ការតភ្ជាប់ server» លើ website។

កំណត់បានតាម env៖ `VIDEO_PROFILE=ltx|cogvideox|zeroscope|auto` (default `auto`),
`PORT`, `API_TOKEN`, `VIDEO_HOME`, `VIDEO_RAW`, `HF_TOKEN`។

## ២. ដំណើរការ server ដោយដៃ (notebook)

1. បើក [colab.research.google.com](https://colab.research.google.com) → **Upload** →
   `server/colab_t4_server.ipynb`
2. `Runtime → Change runtime type → Hardware accelerator: T4 GPU` → Save
3. `Runtime → Run all` (cell ទី១ បង្ហាញ `nvidia-smi`)
4. Cell ចុងក្រោយបង្ហាញ៖

   ```
   ==============================================================
   Server URL: https://random-words-1234.trycloudflare.com
   ==============================================================
   ```

5. ចម្លង URL នោះទៅដាក់ក្នុង website → **ការតភ្ជាប់ server** → **ភ្ជាប់**

> URL នេះប្តូររាល់ពេល restart notebook។ បើទុក notebook បើក វា run បានរហូត
> (Colab បិទបន្ទាប់ពី ~90 នាទី បើគ្មានសកម្មភាព)។

### បើមិនចង់ប្រើ notebook

```bash
# ក្នុង Colab cell ឬ terminal ណាមួយដែលមាន GPU T4
git clone <your-repo> && cd <your-repo>
pip install -r server/requirements.txt
python server/colab_server.py --port 8000          # បន្ថែម API_TOKEN=secret ក៏បាន

# terminal ទី២
wget -q -O cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared && ./cloudflared tunnel --url http://localhost:8000
```

## ៣. ដំណើរការ website

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build → dist/
```

## របៀបប្រើ

1. សរសេរ prompt ជាភាសាខ្មែរ (ឬជ្រើសឧទាហរណ៍)
2. ចុច **បកប្រែមើល** ដើម្បីមើលអត្ថបទអង់គ្លេសមុន (ស្រេចចិត្ត)
3. ជ្រើសទំហំផ្ទាំង (16:9 / 9:16 / 1:1) និងគុណភាព (លឿន / ធម្មតា / ខ្ពស់)
4. ចុច **បង្កើតវីដេអូ** → progress បង្ហាញដំណាក់កាល (បកប្រែ → បង្កើត → encode)
5. វីដេអូចេញជា MP4 អាចចាក់/ទាញយក ហើយរក្សាទុកក្នុង **ប្រវត្តិវីដេអូ** (localStorage)

## API របស់ server

| Method | Path | ការពិពណ៌នា |
| --- | --- | --- |
| `GET` | `/api/health` | GPU, VRAM, model, queue |
| `POST` | `/api/translate` | `{text}` → `{translated_prompt}` (ខ្មែរ → អង់គ្លេស) |
| `POST` | `/api/generate` | បង្កើត job → ត្រឡប់ job object |
| `GET` | `/api/jobs/{id}` | status, stage, progress, video_url |
| `GET` | `/api/videos/{name}` | file MP4 (รองรับ Range) |
| `GET` | `/docs` | Swagger UI ស្វ័យប្រវត្តិ |

Environment variables សំខាន់៖ `API_TOKEN`, `VIDEO_MODEL`, `TRANSLATE_MODEL`, `FPS`,
`PRELOAD`, `OUTPUT_DIR`

## Models និងដែនកំណត់របស់ T4

| Profile | Model | ទាញយក | លក្ខណៈ |
| --- | --- | --- | --- |
| `ltx` (default លើ T4) | `Lightricks/LTX-Video` | ~១៥–២០ GB | 2B DiT + T5-XXL · 24 fps · គុណភាពល្អបំផុត |
| `cogvideox` | `THUDM/CogVideoX-5b` | ~២០ GB | 5B · 8 fps · យឺតលើ T4 |
| `zeroscope` | `cerspense/zeroscope_v2_576w` | ~៩ GB | ស្រាល · សម្រាប់ GPU ៨–១៦ GB |
| បកប្រែ | `facebook/nllb-200-distilled-600M` | ~២.៥ GB | ខ្មែរ → អង់គ្លេស |

- T4 មាន VRAM 16 GB — server បើក `enable_model_cpu_offload()` និងរក្សា VAE ក្នុង
  fp32 (T4 គ្មាន bf16 → fp16 VAE ញាក់ចេញ frame ខ្មៅ)
- LTX: 768×512 · 49–161 frames · ២៥ steps ឡើងទៅ ≈ ២–៥ នាទី / វីដេអូ
- website preset ត្រូវបាន snap ដោយស្វ័យប្រវត្តិ (ទំហំចែកដាច់នឹង 32, frames = 8k+1)
- GPU ២ គ្រឿង **មិនរួម VRAM គ្នាទេ** — server ប្រើ GPU 0 តែមួយ
- បើយឺត ឬ out of memory → ជ្រើស **លឿន** (16 frames · 20 steps) ឬបន្ថយទំហំ
- job ដំណើរការម្តងមួយ (queue) ព្រោះ GPU មួយ

## English quick start

```bash
npm install && npm run dev              # website at http://localhost:3000
```

1. Open `server/colab_t4_server.ipynb` in Google Colab, select a **T4 GPU** runtime, Run all.
2. Copy the `https://….trycloudflare.com` URL printed by the last cell.
3. In the website, open **Server connection**, paste the URL (and API token if you set
   `API_TOKEN`), press Connect.
4. Type a Khmer prompt and press **Generate video**. The server translates it with
   NLLB-200, generates frames with zeroscope v2 576w in fp16 with CPU offload, and
   encodes an MP4 that the site streams back.

## Security

- `cloudflared` quick tunnels are **public** — anyone with the URL can spend your GPU time.
  Set `API_TOKEN` (Colab cell 3) and the same token in the website to lock it down.
- The token is kept in `localStorage` only; never commit keys to the repo.
- Generated videos are stored in `server/outputs/` and deleted when the Colab runtime ends.

## Troubleshooting

| បញ្ហា | ដំណោះស្រាយ |
| --- | --- |
| `Failed to fetch` ឬ Offline | URL tunnel ខុស/ផុតកំណត់ — restart cell ទី៤ រួច paste URL ថ្មី |
| `401` | API_TOKEN មិនត្រូវគ្នា — ដាក់ token ដូចគ្នាទាំង server និង website |
| វីដេអូយឺតខ្លាំង | លើកដំបូងត្រូវ download model (~4 GB) រួចបង្កើត — រង់ចាំ |
| `CUDA out of memory` | ជ្រើសគុណភាព **លឿន**, បន្ថយ frames, ឬ restart runtime |
| Colab បិទដោយខ្លួនឯង | Colab កំណត់ idle ~90 នាទី — បើកឡើងវិញ រួច paste URL ថ្មី |
