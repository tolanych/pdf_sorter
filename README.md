[Беларуская версія](README.be.md)

# File Rename Agent

Intelligent renaming and sorting of PDF files, document scans, and photos using AI.

The agent reads each file (extracts text or runs OCR), sends the content to a language model, and suggests a clean name in the format `category_subject_date.pdf`.

**Before:** `IMG_20240315_001.jpg`, `scan0042.pdf`, `Document (3).pdf`
**After:** `invoice_orange_2024-03.jpg`, `certificate_social_insurance_smith_2024-01.pdf`, `lease_agreement_apartment_2024-02.pdf`

---

## How It Works

```
your files ──► read text / OCR ──► send to LLM ──► get new name ──► rename
```

Three modes of operation:

| Mode | What it does | Command |
|---|---|---|
| **Rename** | Gives files meaningful names | `npm run apply` |
| **Organize** | Sorts files into category folders | `npm run organize` |
| **Organize smart** | Sorts by analyzing file content via LLM | `npm run organize:smart` |

All modes work in **preview mode by default** (`--dry-run`). Add `--apply` to make real changes.

---

## Quick Start

### macOS / Linux

```bash
git clone <repository-url>
cd file_rename
./setup.sh
```

The script creates a Python virtual environment, installs all dependencies, and prepares `.env`. After that, add your API key:

```bash
nano .env    # set OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY, or use Ollama (free)
```

Try a preview:

```bash
npm run apply -- --dry-run --target-dir ~/Desktop/documents
```

### Windows (PowerShell)

```powershell
git clone <repository-url>
cd file_rename

py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install pdfplumber Pillow PyMuPDF easyocr

npm --prefix tools/rename-agent install
Copy-Item .env.example .env
```

Edit `.env`: set `READER_PYTHON` to the full path (e.g. `C:\path\to\file_rename\.venv\Scripts\python.exe`) and add an API key.

```powershell
npm run apply -- --dry-run --target-dir "C:\Users\You\Documents"
```

---

## Free vs Paid Models

| Option | Cost | Needs internet | Setup |
|---|---|---|---|
| **Ollama** (local) | Free | No | Install [Ollama](https://ollama.com), run `ollama serve`, then `ollama pull gpt-oss:20b` |
| **OpenRouter** | Free / Paid | Yes | Get a key at [openrouter.ai](https://openrouter.ai), set `OPENROUTER_API_KEY` in `.env` |
| **OpenAI** | Paid (API) | Yes | Get a key at [platform.openai.com](https://platform.openai.com), set `OPENAI_API_KEY` in `.env` |
| **Google Gemini** | Paid (API) | Yes | Get a key at [aistudio.google.com](https://aistudio.google.com), set `GOOGLE_GEMINI_API_KEY` in `.env` |

With Ollama, the agent works entirely offline and free of charge.

### Supported Models

| Provider | Models |
|---|---|
| OpenAI | `gpt-4o`, `gpt-4o-mini`, `gpt-4.1-2025-04-14`, `gpt-4.1-nano`, `gpt-5`, `gpt-5.1`, `gpt-5-mini`, `gpt-5-nano` |
| OpenRouter | `openrouter/free` (default) or other available models |
| Google | `gemini-2.5-pro` |
| Ollama | `llama3.2`, `mistral-small3.1`, `llama3.3:latest`, `gemma3:4b`, `gemma3:12b`, `gpt-oss:20b` |

---

## Usage

All commands are run from the project root.

### Renaming Files

```bash
# Preview (safe, no changes)
npm run apply -- --dry-run --target-dir ~/docs

# Apply renaming
npm run apply -- --target-dir ~/docs --apply

# Choose a model
npm run apply -- --target-dir ~/docs --model gpt-4o-mini --apply

# Local model (offline)
npm run apply -- --target-dir ~/docs --model llama3.3:latest --apply

# Rename only PDFs
npm run apply:pdf -- --target-dir ~/docs --apply

# Rename only photos
npm run apply:photos -- --target-dir ~/docs --apply

# Limit to 10 files (good for testing)
npm run apply -- --target-dir ~/docs --limit 10 --apply
```

### Naming Language

Names are generated in English by default. Change with `--lang`:

```bash
npm run apply -- --target-dir ~/docs --lang pl --apply   # Polish
npm run apply -- --target-dir ~/docs --lang be --apply   # Belarusian (transliteration)
npm run apply -- --target-dir ~/docs --lang ru --apply   # Russian (transliteration)
```

Or set once in `.env`:

```env
NAMING_LANG=en
```

### Sorting Files into Folders

```bash
# Standard sorting (by file name)
npm run organize -- --target-dir ~/docs --apply

# Smart sorting (reads content, asks LLM for the category)
npm run organize:smart -- --target-dir ~/docs --apply
```

Result:

```
sorted_documents/
├── invoices/
├── taxes_and_social/
├── contracts/
└── other/
```

### Full Workflow Example

```bash
# 1. Preview what will be renamed
npm run apply -- --dry-run --target-dir ~/Desktop/my-docs

# 2. Rename
npm run apply -- --target-dir ~/Desktop/my-docs --apply

# 3. Sort into folders
npm run organize -- --target-dir ~/Desktop/my-docs --apply
```

---

## Command Reference

### `npm run apply` — renaming

| Parameter | Description | Default |
|---|---|---|
| `--target-dir <path>` | Folder with files to process | `TARGET_DIR` from `.env` |
| `--dry-run` | Preview only, no changes | *(default)* |
| `--apply` | Execute renaming | |
| `--model <name>` | LLM model | auto-detected from `.env` keys |
| `--include <preset\|glob>` | Filter: `pdf`, `photos`, `docs`, `all`, or a glob | `all` |
| `--lang <code>` | Naming language: `en`, `pl`, `be`, `ru` | `en` |
| `--limit <N>` | Process only first N files | all |
| `--ignore-list <path>` | Custom ignore list path | `.rename-agent-ignore-rename.txt` |
| `--no-update-ignore-list` | Don't update the ignore list | |
| `--ollama-base-url <url>` | Ollama server URL | `http://localhost:11434` |

Shortcut commands: `npm run apply:pdf`, `npm run apply:photos`, `npm run apply:docs`.

### `npm run organize` — sorting

| Parameter | Description | Default |
|---|---|---|
| `--target-dir <path>` | Folder with files | `TARGET_DIR` from `.env` |
| `--dry-run` | Preview only | *(default)* |
| `--apply` | Execute sorting | |
| `--smart` | Analyze content via LLM | off |
| `--model <name>` | LLM model (for `--smart`) | same as `apply` |
| `--out-dir <name>` | Output folder name | `sorted_documents` |
| `--limit <N>` | Process only first N files | all |
| `--ignore-list <path>` | Custom ignore list path | `.rename-agent-ignore-organize.txt` |
| `--no-update-ignore-list` | Don't update the ignore list | |

Shortcut: `npm run organize:smart` = `npm run organize -- --smart`.

### `read_document.py` — reading / OCR

```bash
.venv/bin/python tools/read_document.py <file> [options]
```

| Parameter | Description | Default |
|---|---|---|
| `file` | Path to file (PDF, JPG, PNG, ...) | *(required)* |
| `--mode` | `auto`, `text`, `ocr` | `auto` |
| `--lang` | OCR languages (EasyOCR codes, comma-separated) | `en,ru,be,uk` |
| `--pages` | Page range, e.g. `1-3,5` | all |
| `--dpi` | Render DPI | `300` |
| `--output` / `-o` | Save to file | stdout |
| `--smart-pages` | Auto-select pages for long PDFs | off |

Shell wrapper (finds venv automatically): `./tools/read_doc.sh <file> [options]`

---

## Configuration (.env)

The `.env` file in the project root controls all settings. Created automatically by `setup.sh` or manually from `.env.example`.

Key settings:

```env
# Model (optional — auto-detected from available keys)
LLM_MODEL=gpt-4o-mini

OPENROUTER_API_KEY=sk-...
OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free

# OpenAI
OPENAI_API_KEY=sk-...

# Ollama (local, free)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b

# Google Gemini
GOOGLE_GEMINI_API_KEY=...

# Target folder (or pass --target-dir each time)
TARGET_DIR=

# Naming language: en | pl | be | ru
NAMING_LANG=en

# Python path (setup.sh sets this automatically)
READER_PYTHON=.venv/bin/python

# OCR languages (EasyOCR codes, comma-separated)
OCR_LANG=en,ru,be,uk

# Vision model for organize:smart (optional)
VISION_MODEL=gpt-4o
```

Model priority: `LLM_MODEL` > `OPENROUTER_MODEL` > `OPENAI_MODEL` (if key set) > `OLLAMA_MODEL` > `GOOGLE_MODEL` (if key set) > `gpt-oss:20b` fallback.

---

## Ignore Lists

The agent tracks processed files so you can stop and resume at any time.

Two separate lists (in the project root):
- `.rename-agent-ignore-rename.txt` — for renaming (`apply`)
- `.rename-agent-ignore-organize.txt` — for sorting (`organize`)

What this means:
- **Resume safely** — re-run the command and only new files will be processed
- **Reprocess everything** — delete the ignore file and run again
- **One-time run** — add `--no-update-ignore-list`

```bash
# Resume from where you left off
npm run apply -- --target-dir ~/docs --apply

# Force reprocessing
rm .rename-agent-ignore-rename.txt
npm run apply -- --target-dir ~/docs --apply
```

---

## Output Files

After running, the agent creates files in `tools/rename-agent/outputs/`:

| File | Description |
|---|---|
| `rename-plan.json` | Full renaming plan with metadata |
| `rename-plan.csv` | CSV version (for Excel / Google Sheets) |
| `pending-files.txt` | Files awaiting processing |
| `organize-plan.json` | Sorting plan |
| `organize-plan.csv` | CSV version of the sorting plan |

Additionally, a `DOCUMENT_CATALOG.md` is created in the target folder — an auto-updated catalog of all files.

---

## Naming Rules

Names follow the rules in `tools/rename-agent/rules.prompt.txt`:

- **Format:** `category_subject_date` in snake_case
- **Language:** English, Latin alphabet (by default)
- **Date:** `YYYY-MM` or `YYYY-MM-DD` (if found in the document)
- **People:** surname is added for passports, permits, certificates
- **Unreadable:** `unreadable_scan`
- **Extension:** never changed

Example categories: `invoice`, `tax_return`, `bank_statement`, `contract`, `certificate`, `residence_permit`, `passport`, `application`, `scan`, `report`.

| Before | After |
|---|---|
| `IMG_20240315_001.jpg` | `invoice_orange_2024-03.jpg` |
| `scan0042.pdf` | `certificate_social_insurance_smith_2024-01.pdf` |
| `Document (3).pdf` | `lease_agreement_apartment_2024-02.pdf` |
| `photo_2024.png` | `residence_permit_card_ivanov_2024-05.png` |
| `file.pdf` (unreadable) | `unreadable_scan.pdf` |

---

## Supported File Formats

PDF, JPG/JPEG, PNG, TIFF/TIF, BMP, WebP, GIF, DOC, DOCX, XML

Filter presets for `--include`:

| Preset | Formats |
|---|---|
| `all` | all of the above *(default)* |
| `pdf` | PDF only |
| `photos` | JPG, JPEG, PNG, TIFF, TIF, BMP, WebP, GIF |
| `docs` | DOC, DOCX, XML |

You can also pass a custom glob: `--include "**/*.{pdf,png}"`.

---

## System Requirements

| Dependency | Purpose | macOS | Linux (Ubuntu/Debian) | Windows |
|---|---|---|---|---|
| **Node.js >=18** | Agent runtime | `brew install node` | `sudo apt install -y nodejs npm` | [nodejs.org](https://nodejs.org) LTS installer |
| **Python 3.10+** | OCR and PDF reading | `brew install python` | `sudo apt install -y python3 python3-venv python3-pip` | [python.org](https://python.org) (check "Add to PATH") |

OCR is handled by **EasyOCR** (installed via pip, no system-level OCR packages needed).

### Manual Installation (step by step)

If you prefer not to use `setup.sh`:

```bash
# 1. Clone
git clone <repository-url>
cd file_rename

# 2. Python venv
python3 -m venv .venv
.venv/bin/pip install pdfplumber Pillow PyMuPDF easyocr

# 3. Node.js dependencies
npm --prefix tools/rename-agent install

# 4. Configuration
cp .env.example .env
# Edit .env — add API key, set READER_PYTHON to absolute path

# 5. Verify
.venv/bin/python tools/read_document.py --help
npm run apply -- --dry-run --limit 1 --target-dir ~/Desktop
```

On Windows, replace `.venv/bin/python` with `.\.venv\Scripts\python.exe` and `cp` with `Copy-Item`.

---

## Tips

**Working with different folders:**

```bash
# Pass the path directly
npm run apply -- --target-dir /Volumes/USB/scans --apply

# Or set it in .env so you don't have to type it every time
# TARGET_DIR=~/Documents/my-docs
```

**Shell alias** (macOS/Linux) for frequent use:

```bash
# Add to ~/.zshrc or ~/.bashrc:
alias rename-docs='npm --prefix /path/to/file_rename run apply --'

# Then from anywhere:
rename-docs --target-dir ~/Desktop/scans --apply
```

**Processing new files** — just run the same command again. The ignore list ensures only new files are processed.

---

## Troubleshooting

### "unreadable_scan" for many files

OCR could not recognize the text. Check:
- Python venv has EasyOCR installed: `.venv/bin/python -c "import easyocr; print('OK')"`
- `OCR_LANG` in `.env` includes the right languages (e.g. `en,ru,be,uk`)
- Scan quality is sufficient

### Agent does not see files

- `--target-dir` points to the correct folder
- Files have a supported extension
- Files are not in the ignore list (`.rename-agent-ignore-rename.txt`)

### LLM / model error

- **OpenAI:** check `OPENAI_API_KEY` in `.env`
- **Ollama:** make sure `ollama serve` is running
- **Google:** check `GOOGLE_GEMINI_API_KEY`
- **Unsupported model:** use only models from the [supported list](#supported-models)

### Python not found

The agent looks for Python in this order:
1. `READER_PYTHON` from `.env` (set by `setup.sh`)
2. `.venv/bin/python` in the project root
3. System `python3` (fallback)

Verify the venv works:

```bash
.venv/bin/python -c "import pdfplumber, easyocr, fitz; print('OK')"
```

If something is missing:

```bash
.venv/bin/pip install pdfplumber Pillow PyMuPDF easyocr
```

Windows equivalents: use `.\.venv\Scripts\python.exe` instead of `.venv/bin/python`.
