#!/usr/bin/env python3
"""Regenerate server/colab_t4_server.ipynb from colab_server.py + requirements.txt.

The notebook embeds the server source so it is self-contained: open it in Colab,
run the cells, and nothing needs to be uploaded. Re-run this script after
changing colab_server.py:

    python3 server/make_notebook.py
"""

from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SERVER = (HERE / "colab_server.py").read_text(encoding="utf-8")
REQUIREMENTS = (HERE / "requirements.txt").read_text(encoding="utf-8")


def code(source: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source.splitlines(keepends=True),
    }


def markdown(source: str) -> dict:
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": source.splitlines(keepends=True),
    }


CELLS = [
    markdown(
        "# KhmerClip — T4 video server\n"
        "\n"
        "**របៀបប្រើ / How to use**\n"
        "\n"
        "1. `Runtime → Change runtime type → T4 GPU` (ប្រើ GPU T4 ១៦GB)\n"
        "2. Run cell ទាំងអស់តាមលំដាប់ (`Runtime → Run all`)\n"
        "3. ចម្លង URL `https://....trycloudflare.com` ពី cell ចុងក្រោយ\n"
        "4. បើក website → «ការតភ្ជាប់ server» → paste URL → ភ្ជាប់\n"
        "\n"
        "The first request downloads the model (~4 GB) and is slow. Later jobs\n"
        "use the cached model. Keep this tab open while generating.\n"
    ),
    code("!nvidia-smi\n"),
    markdown("## 1. Server code\n\nThe cell below writes the API server into the Colab VM.\n"),
    code("%%writefile /content/colab_server.py\n" + SERVER),
    code("%%writefile /content/requirements.txt\n" + REQUIREMENTS),
    markdown("## 2. Dependencies\n"),
    code("%pip install -q -r /content/requirements.txt\n"),
    markdown(
        "## 3. Start the API on port 8000\n"
        "\n"
        "Optional: uncomment the `API_TOKEN` line to protect the endpoint, then\n"
        "paste the same token into the website.\n"
    ),
    code(
        "import json\n"
        "import os\n"
        "import sys\n"
        "import threading\n"
        "import time\n"
        "import urllib.request\n"
        "\n"
        "sys.path.insert(0, \"/content\")\n"
        "\n"
        "# os.environ[\"API_TOKEN\"] = \"my-secret-token\"\n"
        "\n"
        "import colab_server as backend\n"
        "import uvicorn\n"
        "\n"
        "config = uvicorn.Config(backend.app, host=\"0.0.0.0\", port=8000, log_level=\"warning\")\n"
        "server = uvicorn.Server(config)\n"
        "threading.Thread(target=server.run, daemon=True).start()\n"
        "\n"
        "time.sleep(4)\n"
        "with urllib.request.urlopen(\"http://127.0.0.1:8000/api/health\", timeout=30) as response:\n"
        "    print(json.dumps(json.load(response), indent=2))\n"
    ),
    markdown("## 4. Public URL (Cloudflare tunnel)\n"),
    code(
        "import pathlib\n"
        "import re\n"
        "import subprocess\n"
        "import time\n"
        "\n"
        "binary = pathlib.Path(\"/content/cloudflared\")\n"
        "if not binary.exists():\n"
        "    !wget -q -O /content/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64\n"
        "    !chmod +x /content/cloudflared\n"
        "\n"
        "log = pathlib.Path(\"/content/tunnel.log\")\n"
        "subprocess.Popen(\n"
        "    [str(binary), \"tunnel\", \"--url\", \"http://localhost:8000\", \"--no-autoupdate\"],\n"
        "    stdout=log.open(\"w\"),\n"
        "    stderr=subprocess.STDOUT,\n"
        ")\n"
        "\n"
        "url = None\n"
        "for _ in range(45):\n"
        "    time.sleep(1)\n"
        "    text = log.read_text(errors=\"ignore\") if log.exists() else \"\"\n"
        "    match = re.search(r\"https://[a-z0-9-]+\\.trycloudflare\\.com\", text)\n"
        "    if match:\n"
        "        url = match.group(0)\n"
        "        break\n"
        "\n"
        "print(\"\\n\" + \"=\" * 62)\n"
        "print(\"Server URL:\", url or \"not ready yet — re-run this cell\")\n"
        "print(\"=\" * 62)\n"
    ),
    markdown(
        "## 5. Done\n"
        "\n"
        "Paste the URL above into the website and press **ភ្ជាប់**.\n"
        "\n"
        "Tips for T4:\n"
        "\n"
        "- 576×320, 24 frames, 25 steps ≈ 2–4 minutes per clip.\n"
        "- If Colab runs out of VRAM, use the **លឿន (Fast)** preset in the website.\n"
        "- The tunnel URL changes every time you restart this notebook.\n"
    ),
]

NOTEBOOK = {
    "cells": CELLS,
    "metadata": {
        "accelerator": "GPU",
        "colab": {"provenance": [], "gpuType": "T4", "toc_visible": True},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "language_info": {"name": "python"},
    },
    "nbformat": 4,
    "nbformat_minor": 0,
}


def main() -> None:
    target = HERE / "colab_t4_server.ipynb"
    target.write_text(json.dumps(NOTEBOOK, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {target} ({target.stat().st_size / 1024:.0f} KB, {len(CELLS)} cells)")


if __name__ == "__main__":
    main()
