[English version](README.md)

# File Rename Agent

Разумнае перайменаванне і сартыроўка PDF-файлаў, сканаў і фатаграфій дакументаў з дапамогай AI.

Агент чытае кожны файл (выцягвае тэкст або запускае OCR), адпраўляе змесціва ў моўную мадэль і прапануе зразумелую назву ў фармаце `category_subject_date.pdf`.

**Было:** `IMG_20240315_001.jpg`, `scan0042.pdf`, `Document (3).pdf`
**Стала:** `invoice_orange_2024-03.jpg`, `certificate_social_insurance_smith_2024-01.pdf`, `lease_agreement_apartment_2024-02.pdf`

---

## Як гэта працуе

```
вашы файлы ──► чытанне тэксту / OCR ──► адпраўка ў LLM ──► новая назва ──► перайменаванне
```

Тры рэжымы працы:

| Рэжым | Што робіць | Каманда |
|---|---|---|
| **Перайменаванне** | Дае файлам зразумелыя назвы | `npm run apply` |
| **Сартыроўка** | Раскладвае файлы па папках-катэгорыях | `npm run organize` |
| **Разумная сартыроўка** | Сартуе па змесціву файла праз LLM | `npm run organize:smart` |

Усе рэжымы працуюць у **рэжыме прагляду** па змаўчанні (`--dry-run`). Дадайце `--apply` для рэальных змен.

---

## Хуткі старт

### macOS / Linux

```bash
git clone <url-рэпазіторыя>
cd file_rename
./setup.sh
```

Скрыпт створыць Python-асяроддзе, усталюе ўсе залежнасці і падрыхтуе `.env`. Пасля гэтага дадайце API-ключ:

```bash
nano .env    # задайце OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY, або выкарыстоўвайце Ollama (бясплатна)
```

Паспрабуйце прагляд:

```bash
npm run apply -- --dry-run --target-dir ~/Desktop/documents
```

### Windows (PowerShell)

```powershell
git clone <url-рэпазіторыя>
cd file_rename

py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install pdfplumber Pillow PyMuPDF easyocr

npm --prefix tools/rename-agent install
Copy-Item .env.example .env
```

Адрэдагуйце `.env`: задайце `READER_PYTHON` як поўны шлях (напр. `C:\path\to\file_rename\.venv\Scripts\python.exe`) і дадайце API-ключ.

```powershell
npm run apply -- --dry-run --target-dir "C:\Users\You\Documents"
```

---

## Бясплатна або з API-ключом

| Варыянт | Кошт | Трэба інтэрнэт | Як наладзіць |
|---|---|---|---|
| **Ollama** (лакальна) | Бясплатна | Не | Усталюйце [Ollama](https://ollama.com), запусціце `ollama serve`, потым `ollama pull gpt-oss:20b` |
| **OpenRouter** | Бясплатна | Так | Атрымайце ключ на [openrouter.ai](https://openrouter.ai), задайце `OPENROUTER_API_KEY` у `.env` |
| **OpenAI** | Платна (API) | Так | Атрымайце ключ на [platform.openai.com](https://platform.openai.com), задайце `OPENAI_API_KEY` у `.env` |
| **Google Gemini** | Платна (API) | Так | Атрымайце ключ на [aistudio.google.com](https://aistudio.google.com), задайце `GOOGLE_GEMINI_API_KEY` у `.env` |

З Ollama агент працуе цалкам аўтаномна і бясплатна.

### Падтрымліваемыя мадэлі

| Правайдар | Мадэлі |
|---|---|
| OpenAI | `gpt-4o`, `gpt-4o-mini`, `gpt-4.1-2025-04-14`, `gpt-4.1-nano`, `gpt-5`, `gpt-5.1`, `gpt-5-mini`, `gpt-5-nano` |
| OpenRouter | `openrouter/free` (па змаўчанні) або іншыя даступныя мадэлі |
| Google | `gemini-2.5-pro` |
| Ollama | `llama3.2`, `mistral-small3.1`, `llama3.3:latest`, `gemma3:4b`, `gemma3:12b`, `gpt-oss:20b` |

---

## Выкарыстанне

Усе каманды запускаюцца з кораня праекта.

### Перайменаванне файлаў

```bash
# Прагляд (бяспечна, без змен)
npm run apply -- --dry-run --target-dir ~/docs

# Выканаць перайменаванне
npm run apply -- --target-dir ~/docs --apply

# Выбраць мадэль
npm run apply -- --target-dir ~/docs --model gpt-4o-mini --apply

# Лакальная мадэль (без інтэрнэту)
npm run apply -- --target-dir ~/docs --model llama3.3:latest --apply

# Толькі PDF
npm run apply:pdf -- --target-dir ~/docs --apply

# Толькі фатаграфіі
npm run apply:photos -- --target-dir ~/docs --apply

# Абмежаваць 10 файламі (добра для тэсту)
npm run apply -- --target-dir ~/docs --limit 10 --apply
```

### Мова назваў

Па змаўчанні назвы генеруюцца на англійскай. Зменіць праз `--lang`:

```bash
npm run apply -- --target-dir ~/docs --lang pl --apply   # Польская
npm run apply -- --target-dir ~/docs --lang be --apply   # Беларуская (транслітарацыя)
npm run apply -- --target-dir ~/docs --lang ru --apply   # Руская (транслітарацыя)
```

Або задаць адзін раз у `.env`:

```env
NAMING_LANG=en
```

### Сартыроўка файлаў па папках

```bash
# Звычайная сартыроўка (па назве файла)
npm run organize -- --target-dir ~/docs --apply

# Разумная сартыроўка (чытае змесціва, пытае LLM пра катэгорыю)
npm run organize:smart -- --target-dir ~/docs --apply
```

Вынік:

```
sorted_documents/
├── invoices/
├── taxes_and_social/
├── contracts/
└── other/
```

### Поўны прыклад працоўнага цыкла

```bash
# 1. Паглядзець, што будзе перайменавана
npm run apply -- --dry-run --target-dir ~/Desktop/my-docs

# 2. Перайменаваць
npm run apply -- --target-dir ~/Desktop/my-docs --apply

# 3. Рассартаваць па папках
npm run organize -- --target-dir ~/Desktop/my-docs --apply
```

---

## Даведка па камандах

### `npm run apply` — перайменаванне

| Параметр | Апісанне | Змаўчанне |
|---|---|---|
| `--target-dir <шлях>` | Папка з файламі | `TARGET_DIR` з `.env` |
| `--dry-run` | Толькі прагляд, без змен | *(па змаўчанні)* |
| `--apply` | Выканаць перайменаванне | |
| `--model <назва>` | Мадэль LLM | аўта-выбар па ключах у `.env` |
| `--include <прасэт\|glob>` | Фільтр: `pdf`, `photos`, `docs`, `all` або glob | `all` |
| `--lang <код>` | Мова назваў: `en`, `pl`, `be`, `ru` | `en` |
| `--limit <N>` | Апрацаваць толькі першыя N файлаў | усе |
| `--ignore-list <шлях>` | Свой шлях да ignore-ліста | `.rename-agent-ignore-rename.txt` |
| `--no-update-ignore-list` | Не абнаўляць ignore-ліст | |
| `--ollama-base-url <url>` | URL сервера Ollama | `http://localhost:11434` |

Хуткія каманды: `npm run apply:pdf`, `npm run apply:photos`, `npm run apply:docs`.

### `npm run organize` — сартыроўка

| Параметр | Апісанне | Змаўчанне |
|---|---|---|
| `--target-dir <шлях>` | Папка з файламі | `TARGET_DIR` з `.env` |
| `--dry-run` | Толькі прагляд | *(па змаўчанні)* |
| `--apply` | Выканаць сартыроўку | |
| `--smart` | Аналіз змесціва праз LLM | выкл. |
| `--model <назва>` | Мадэль LLM (для `--smart`) | як у `apply` |
| `--out-dir <назва>` | Назва выходной папкі | `sorted_documents` |
| `--limit <N>` | Апрацаваць толькі першыя N файлаў | усе |
| `--ignore-list <шлях>` | Свой шлях да ignore-ліста | `.rename-agent-ignore-organize.txt` |
| `--no-update-ignore-list` | Не абнаўляць ignore-ліст | |

Хуткая каманда: `npm run organize:smart` = `npm run organize -- --smart`.

### `read_document.py` — чытанне / OCR

```bash
.venv/bin/python tools/read_document.py <файл> [опцыі]
```

| Параметр | Апісанне | Змаўчанне |
|---|---|---|
| `file` | Шлях да файла (PDF, JPG, PNG, ...) | *(абавязковы)* |
| `--mode` | `auto`, `text`, `ocr` | `auto` |
| `--lang` | Мовы OCR (коды EasyOCR, праз коску) | `en,ru,be,uk` |
| `--pages` | Дыяпазон старонак, напр. `1-3,5` | усе |
| `--dpi` | DPI для рэндэрынгу | `300` |
| `--output` / `-o` | Захаваць у файл | stdout |
| `--smart-pages` | Аўта-выбар старонак для доўгіх PDF | выкл. |

Shell-абалонка (сама знаходзіць venv): `./tools/read_doc.sh <файл> [опцыі]`

---

## Канфігурацыя (.env)

Файл `.env` у корані праекта кіруе ўсімі наладамі. Ствараецца аўтаматычна праз `setup.sh` або ўручную з `.env.example`.

Асноўныя налады:

```env
# Мадэль (апцыянальна — вызначаецца аўтаматычна па даступных ключах)
LLM_MODEL=gpt-4o-mini

OPENROUTER_API_KEY=sk-...
OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free

# OpenAI
OPENAI_API_KEY=sk-...

# Ollama (лакальна, бясплатна)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b

# Google Gemini
GOOGLE_GEMINI_API_KEY=...

# Мэтавая папка (або перадавайце --target-dir кожны раз)
TARGET_DIR=

# Мова назваў: en | pl | be | ru
NAMING_LANG=en

# Шлях да Python (setup.sh задае аўтаматычна)
READER_PYTHON=.venv/bin/python

# Мовы OCR (коды EasyOCR, праз коску)
OCR_LANG=en,ru,be,uk

# Vision-мадэль для organize:smart (апцыянальна)
VISION_MODEL=gpt-4o
```

Прыярытэт мадэлі: `LLM_MODEL` > `OPENROUTER_MODEL` > `OPENAI_MODEL` (калі ёсць ключ) > `OLLAMA_MODEL` > `GOOGLE_MODEL` (калі ёсць ключ) > `gpt-oss:20b` як fallback.

---

## Ignore-лісты

Агент запамінае апрацаваныя файлы, каб можна было спыніцца і працягнуць у любы момант.

Два асобныя спісы (у корані праекта):
- `.rename-agent-ignore-rename.txt` — для перайменавання (`apply`)
- `.rename-agent-ignore-organize.txt` — для сартыроўкі (`organize`)

Што гэта значыць:
- **Бяспечна спыніць і працягнуць** — запусціце каманду зноў, і будуць апрацаваны толькі новыя файлы
- **Пераапрацаваць усё** — выдаліце ignore-файл і запусціце зноў
- **Разавы запуск** — дадайце `--no-update-ignore-list`

```bash
# Працягнуць з месца спынення
npm run apply -- --target-dir ~/docs --apply

# Прымусовая пераапрацоўка
rm .rename-agent-ignore-rename.txt
npm run apply -- --target-dir ~/docs --apply
```

---

## Вынікі працы

Пасля запуску агент стварае файлы ў `tools/rename-agent/outputs/`:

| Файл | Апісанне |
|---|---|
| `rename-plan.json` | Поўны план перайменавання з метаданымі |
| `rename-plan.csv` | CSV-версія (для Excel / Google Sheets) |
| `pending-files.txt` | Файлы, якія чакаюць апрацоўкі |
| `organize-plan.json` | План сартыроўкі |
| `organize-plan.csv` | CSV-версія плана сартыроўкі |

Дадаткова ў мэтавай папцы ствараецца `DOCUMENT_CATALOG.md` — аўтаматычна абнаўляемы каталог усіх файлаў.

---

## Правілы наймення

Назвы генеруюцца паводле правілаў з `tools/rename-agent/rules.prompt.txt`:

- **Фармат:** `category_subject_date` у snake_case
- **Мова:** англійская, лацінскі алфавіт (па змаўчанні)
- **Дата:** `YYYY-MM` або `YYYY-MM-DD` (калі знойдзена ў дакуменце)
- **Людзі:** прозвішча дадаецца для пашпартоў, дазволаў, сертыфікатаў
- **Нечытэльныя:** `unreadable_scan`
- **Пашырэнне:** ніколі не змяняецца

Прыклады катэгорый: `invoice`, `tax_return`, `bank_statement`, `contract`, `certificate`, `residence_permit`, `passport`, `application`, `scan`, `report`.

| Было | Стала |
|---|---|
| `IMG_20240315_001.jpg` | `invoice_orange_2024-03.jpg` |
| `scan0042.pdf` | `certificate_social_insurance_smith_2024-01.pdf` |
| `Document (3).pdf` | `lease_agreement_apartment_2024-02.pdf` |
| `photo_2024.png` | `residence_permit_card_ivanov_2024-05.png` |
| `file.pdf` (нечытэльны) | `unreadable_scan.pdf` |

---

## Падтрымліваемыя фарматы файлаў

PDF, JPG/JPEG, PNG, TIFF/TIF, BMP, WebP, GIF, DOC, DOCX, XML

Прасэты для `--include`:

| Прасэт | Фарматы |
|---|---|
| `all` | усе пералічаныя *(па змаўчанні)* |
| `pdf` | толькі PDF |
| `photos` | JPG, JPEG, PNG, TIFF, TIF, BMP, WebP, GIF |
| `docs` | DOC, DOCX, XML |

Можна перадаць кастомны glob: `--include "**/*.{pdf,png}"`.

---

## Сістэмныя патрабаванні

| Залежнасць | Навошта | macOS | Linux (Ubuntu/Debian) | Windows |
|---|---|---|---|---|
| **Node.js >=18** | Рантайм агента | `brew install node` | `sudo apt install -y nodejs npm` | [nodejs.org](https://nodejs.org) LTS |
| **Python 3.10+** | OCR і чытанне PDF | `brew install python` | `sudo apt install -y python3 python3-venv python3-pip` | [python.org](https://python.org) (адзначце "Add to PATH") |

OCR рэалізаваны праз **EasyOCR** (усталёўваецца праз pip, сістэмныя OCR-пакеты не патрэбны).

### Ручная ўстаноўка (пакрокава)

Калі не хочаце выкарыстоўваць `setup.sh`:

```bash
# 1. Кланаванне
git clone <url-рэпазіторыя>
cd file_rename

# 2. Python venv
python3 -m venv .venv
.venv/bin/pip install pdfplumber Pillow PyMuPDF easyocr

# 3. Node.js-залежнасці
npm --prefix tools/rename-agent install

# 4. Канфігурацыя
cp .env.example .env
# Адрэдагуйце .env — дадайце API-ключ, задайце READER_PYTHON як абсалютны шлях

# 5. Праверка
.venv/bin/python tools/read_document.py --help
npm run apply -- --dry-run --limit 1 --target-dir ~/Desktop
```

На Windows замяніце `.venv/bin/python` на `.\.venv\Scripts\python.exe` і `cp` на `Copy-Item`.

---

## Парады

**Праца з рознымі папкамі:**

```bash
# Перадайце шлях напрамую
npm run apply -- --target-dir /Volumes/USB/scans --apply

# Або задайце ў .env, каб не набіраць кожны раз
# TARGET_DIR=~/Documents/my-docs
```

**Shell-аліас** (macOS/Linux) для частага выкарыстання:

```bash
# Дадайце ў ~/.zshrc або ~/.bashrc:
alias rename-docs='npm --prefix /шлях/да/file_rename run apply --'

# Потым з любой папкі:
rename-docs --target-dir ~/Desktop/scans --apply
```

**Апрацоўка новых файлаў** — проста запусціце тую ж каманду зноў. Ignore-ліст гарантуе, што апрацуюцца толькі новыя файлы.

---

## Пытанні і праблемы

### «unreadable_scan» для многіх файлаў

OCR не змог распазнаць тэкст. Праверце:
- У Python venv ёсць EasyOCR: `.venv/bin/python -c "import easyocr; print('OK')"`
- `OCR_LANG` у `.env` утрымлівае патрэбныя мовы (напр. `en,ru,be,uk`)
- Якасць сканаў дастатковая

### Агент не бачыць файлы

- `--target-dir` паказвае на правільную папку
- Файлы маюць падтрымліваемае пашырэнне
- Файлы не ў ignore-лісце (`.rename-agent-ignore-rename.txt`)

### Памылка LLM / мадэлі

- **OpenAI:** праверце `OPENAI_API_KEY` у `.env`
- **Ollama:** пераканайцеся, што `ollama serve` запушчаны
- **Google:** праверце `GOOGLE_GEMINI_API_KEY`
- **Unsupported model:** выкарыстоўвайце толькі мадэлі з [спісу](#падтрымліваемыя-мадэлі)

### Python не знойдзены

Агент шукае Python у такім парадку:
1. `READER_PYTHON` з `.env` (задаецца `setup.sh`)
2. `.venv/bin/python` у корані праекта
3. Сістэмны `python3` (фолбэк)

Праверыць, што venv працуе:

```bash
.venv/bin/python -c "import pdfplumber, easyocr, fitz; print('OK')"
```

Калі нешта адсутнічае:

```bash
.venv/bin/pip install pdfplumber Pillow PyMuPDF easyocr
```

На Windows: выкарыстоўвайце `.\.venv\Scripts\python.exe` замест `.venv/bin/python`.
