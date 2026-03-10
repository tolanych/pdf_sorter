import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Provider } from "./llm.mjs";

const moduleFile = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(moduleFile);
const projectRoot = path.resolve(moduleDir, "../../..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const INCLUDE_PRESETS = {
  all: "**/*.{pdf,jpg,jpeg,png,tiff,tif,bmp,webp,gif,doc,docx,xml}",
  pdf: "**/*.pdf",
  photos: "**/*.{jpg,jpeg,png,tiff,tif,bmp,webp,gif}",
  docs: "**/*.{doc,docx,xml}",
};

/**
 * Resolve LLM provider from env.
 * Priority: LLM_PROVIDER > auto-detect by available API keys > ollama fallback.
 */
function resolveProvider() {
  const explicit = (process.env.LLM_PROVIDER || "").toLowerCase().trim();
  if (explicit) return explicit;

  // Auto-detect by available keys
  if (process.env.OPENROUTER_API_KEY) return Provider.OPENROUTER;
  if (process.env.OPENAI_API_KEY) return Provider.OPENAI;
  if (process.env.GOOGLE_GEMINI_API_KEY) return Provider.GOOGLE;
  return Provider.OLLAMA;
}

/**
 * Resolve model within the given provider.
 * Priority: LLM_MODEL > provider-specific *_MODEL env > built-in default.
 */
function resolveModel(provider) {
  if (process.env.LLM_MODEL) return process.env.LLM_MODEL;

  switch (provider) {
    case Provider.OPENROUTER:
      return process.env.OPENROUTER_MODEL || "openrouter/auto";
    case Provider.OPENAI:
      return process.env.OPENAI_MODEL || "gpt-4o-mini";
    case Provider.GOOGLE:
      return process.env.GOOGLE_MODEL || "gemini-2.5-pro";
    case Provider.OLLAMA:
      return process.env.OLLAMA_MODEL || "gpt-oss:20b";
    default:
      return "gpt-oss:20b";
  }
}

/**
 * Resolve vision provider + model.
 * Uses VISION_PROVIDER/VISION_MODEL if set, otherwise falls back to main provider.
 */
function resolveVision(mainProvider) {
  const vModel = process.env.VISION_MODEL;
  if (!vModel) return { provider: mainProvider, model: null };

  const vProvider = (process.env.VISION_PROVIDER || "").toLowerCase().trim();
  if (vProvider) return { provider: vProvider, model: vModel };

  // Default vision provider = main provider
  return { provider: mainProvider, model: vModel };
}

export function parseArgs(argv) {
  const defaultTargetDir = process.env.TARGET_DIR || "";
  const args = {
    targetDir: defaultTargetDir,
    dryRun: String(process.env.DRY_RUN || "true").toLowerCase() !== "false",
    provider: "",
    model: "",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    include: [INCLUDE_PRESETS.all],
    exclude: [
      "**/.git/**",
      "**/.venv/**",
      "**/node_modules/**",
      "**/outputs/**",
    ],
    lang: (process.env.NAMING_LANG || "en").toLowerCase(),
    limit: 0,
    ignoreListPath:
      process.env.RENAME_IGNORE_LIST_PATH || process.env.IGNORE_LIST_PATH || "",
    updateIgnoreList:
      String(process.env.UPDATE_IGNORE_LIST || "true").toLowerCase() !==
      "false",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--apply") args.dryRun = false;
    if (token === "--dry-run") args.dryRun = true;
    if (token === "--target-dir") args.targetDir = argv[i + 1];
    if (token === "--provider") args.provider = argv[i + 1];
    if (token === "--model") args.model = argv[i + 1];
    if (token === "--ollama-base-url") args.ollamaBaseUrl = argv[i + 1];
    if (token === "--limit") args.limit = Number(argv[i + 1] || 0);
    if (token === "--ignore-list") args.ignoreListPath = argv[i + 1];
    if (token === "--no-update-ignore-list") args.updateIgnoreList = false;
    if (token === "--lang")
      args.lang = String(argv[i + 1] || "en").toLowerCase();
    if (token === "--include") {
      const val = argv[i + 1] || "";
      // Прасэт (pdf, photos, docs, all) або кастомны glob
      const parts = val
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      args.include = parts.map((p) => INCLUDE_PRESETS[p] || p);
    }
  }

  if (!args.ignoreListPath) {
    args.ignoreListPath = path.join(
      projectRoot,
      ".rename-agent-ignore-rename.txt",
    );
  } else if (!path.isAbsolute(args.ignoreListPath)) {
    args.ignoreListPath = path.resolve(projectRoot, args.ignoreListPath);
  }

  // Resolve provider & model
  if (!args.provider) {
    args.provider = resolveProvider();
  }
  if (!args.model) {
    args.model = resolveModel(args.provider);
  }

  // Resolve vision model
  const vision = resolveVision(args.provider);
  args.visionProvider = vision.provider;
  args.visionModel = vision.model;

  return args;
}
