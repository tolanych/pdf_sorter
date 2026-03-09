#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="$PROJECT_ROOT/tools/rename-agent"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_TEMPLATE="$PROJECT_ROOT/.env.example"
RENAME_IGNORE_FILE="$PROJECT_ROOT/.rename-agent-ignore-rename.txt"
ORGANIZE_IGNORE_FILE="$PROJECT_ROOT/.rename-agent-ignore-organize.txt"
VENV_DIR="$PROJECT_ROOT/.venv"
VENV_PYTHON="$VENV_DIR/bin/python"

echo "=== File Rename Agent — setup ==="
echo "Project root: $PROJECT_ROOT"
echo ""

# 0. System dependencies (tesseract, poppler)
echo "[0/4] System dependencies..."

install_system_deps() {
    if command -v apt-get >/dev/null 2>&1; then
        echo "  Detected Debian/Ubuntu"
        sudo apt-get update -qq
        sudo apt-get install -y -qq tesseract-ocr poppler-utils \
            tesseract-ocr-pol tesseract-ocr-rus tesseract-ocr-bel tesseract-ocr-ukr
    elif command -v dnf >/dev/null 2>&1; then
        echo "  Detected Fedora/RHEL"
        sudo dnf install -y -q tesseract poppler-utils \
            tesseract-langpack-pol tesseract-langpack-rus tesseract-langpack-bel tesseract-langpack-ukr
    elif command -v pacman >/dev/null 2>&1; then
        echo "  Detected Arch Linux"
        sudo pacman -S --noconfirm --needed tesseract poppler \
            tesseract-data-pol tesseract-data-rus tesseract-data-bel tesseract-data-ukr
    elif command -v brew >/dev/null 2>&1; then
        echo "  Detected macOS (Homebrew)"
        brew install tesseract poppler tesseract-lang 2>/dev/null || true
    else
        echo "  WARNING: Unknown package manager. Install manually:"
        echo "    - tesseract-ocr (with pol, rus, bel, ukr language packs)"
        echo "    - poppler-utils (provides pdftoppm for pdf2image)"
    fi
}

MISSING_DEPS=""
if ! command -v tesseract >/dev/null 2>&1; then
    MISSING_DEPS="tesseract"
fi
if ! command -v pdftoppm >/dev/null 2>&1; then
    MISSING_DEPS="$MISSING_DEPS poppler/pdftoppm"
fi

if [ -n "$MISSING_DEPS" ]; then
    echo "  Missing: $MISSING_DEPS"
    install_system_deps
    echo "  system dependencies installed"
else
    echo "  tesseract and poppler already installed"
    # Check language packs
    INSTALLED_LANGS=$(tesseract --list-langs 2>/dev/null || true)
    MISSING_LANGS=""
    for lang in eng pol rus bel ukr; do
        if ! echo "$INSTALLED_LANGS" | grep -q "^${lang}$"; then
            MISSING_LANGS="$MISSING_LANGS $lang"
        fi
    done
    if [ -n "$MISSING_LANGS" ]; then
        echo "  Missing OCR languages:$MISSING_LANGS — installing..."
        install_system_deps
    else
        echo "  OCR languages: eng, pol, rus, bel, ukr — OK"
    fi
fi

# 1. Python venv
echo "[1/5] Python venv..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    echo "  venv created"
else
    echo "  venv already exists"
fi

if [ ! -x "$VENV_PYTHON" ]; then
    echo "  ERROR: venv is broken ($VENV_PYTHON missing)"
    echo "  Remove .venv and run setup again."
    exit 1
fi

if ! "$VENV_PYTHON" -m pip --version >/dev/null 2>&1; then
    echo "  pip missing in venv, restoring with ensurepip..."
    if ! "$VENV_PYTHON" -m ensurepip --upgrade >/dev/null 2>&1; then
        echo "  ERROR: cannot bootstrap pip in venv."
        echo "  On Debian/Ubuntu install: sudo apt install python3-venv"
        echo "  Then remove .venv and run setup again."
        exit 1
    fi
fi

"$VENV_PYTHON" -m pip install --quiet pdfplumber pytesseract Pillow pdf2image PyMuPDF
echo "  pip packages installed"

# 2. Node.js dependencies
echo "[2/5] Node.js dependencies..."
cd "$AGENT_DIR"
npm install --silent
echo "  npm packages installed"

# 3. .env
echo "[3/5] Configuration (.env)..."
if [ ! -f "$ENV_FILE" ]; then
    sed "s|READER_PYTHON=python3|READER_PYTHON=$PROJECT_ROOT/.venv/bin/python|" \
        "$ENV_TEMPLATE" > "$ENV_FILE"
    echo "  .env created from template"
    echo ""
    echo ">>> IMPORTANT: add your API key to $ENV_FILE"
    echo "    Edit the file and set OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY, or configure Ollama."
else
    echo "  .env already exists, skipping"
fi

# 4. ignore lists
echo "[4/5] Ignore lists..."
for f in "$RENAME_IGNORE_FILE" "$ORGANIZE_IGNORE_FILE"; do
    if [ ! -f "$f" ]; then
        {
            echo "# Files already processed by rename-agent"
            echo "# One relative path per line"
        } > "$f"
        echo "  created: $f"
    else
        echo "  exists: $f"
    fi
done

echo ""
echo "=== Setup complete ==="
echo ""
echo "Quick start:"
echo "  npm run apply -- --dry-run --target-dir /path/to/your/documents"
