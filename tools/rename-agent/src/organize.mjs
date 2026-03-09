import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";
import { HumanMessage } from "@langchain/core/messages";
import { extractContent } from "./extractors.mjs";
import { buildChatModel } from "./llm.mjs";
import { parseArgs as parseBaseArgs } from "./config.mjs";
import { appendIgnoreEntries, readIgnoreList } from "./ignore-list.mjs";

const moduleFile = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(moduleFile);
const projectRoot = path.resolve(moduleDir, "../../..");

const IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".tiff",
  ".tif",
  ".bmp",
  ".webp",
  ".gif",
]);

const include = ["**/*.{pdf,jpg,jpeg,png,tiff,tif,bmp,webp,gif,doc,docx,xml}"];
const defaultIgnore = [
  "**/.git/**",
  "**/.venv/**",
  "**/node_modules/**",
  "**/.DS_Store",
  "**/tools/rename-agent/**",
  "**/sorted_documents/**",
  "**/dokumenty_posortowane/**",
];

const CATEGORIES = [
  "real_estate",
  "telecom",
  "business_plans",
  "business_registration",
  "reports",
  "confirmations",
  "bank_statements",
  "surveys",
  "invoices",
  "contracts",
  "applications_and_decisions",
  "powers_of_attorney",
  "certificates",
  "taxes_and_social",
  "identity_documents",
  "photos_of_people",
  "scans_and_photos",
  "other",
];

function parseArgs(argv) {
  const baseConfig = parseBaseArgs(argv);
  const args = {
    targetDir: baseConfig.targetDir || process.env.TARGET_DIR || process.cwd(),
    outDirName: "sorted_documents",
    dryRun: true,
    limit: 0,
    smart: false,
    include: baseConfig.include,
    model: baseConfig.model,
    ollamaBaseUrl: baseConfig.ollamaBaseUrl,
    lang: baseConfig.lang,
    ignoreListPath:
      process.env.ORGANIZE_IGNORE_LIST_PATH ||
      path.join(projectRoot, ".rename-agent-ignore-organize.txt"),
    updateIgnoreList:
      String(
        process.env.ORGANIZE_UPDATE_IGNORE_LIST || "true",
      ).toLowerCase() !== "false",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--target-dir") args.targetDir = argv[i + 1];
    if (token === "--out-dir") args.outDirName = argv[i + 1];
    if (token === "--apply") args.dryRun = false;
    if (token === "--dry-run") args.dryRun = true;
    if (token === "--limit") args.limit = Number(argv[i + 1] || 0);
    if (token === "--smart") args.smart = true;
    if (token === "--ignore-list") args.ignoreListPath = argv[i + 1];
    if (token === "--no-update-ignore-list") args.updateIgnoreList = false;
  }

  if (!path.isAbsolute(args.ignoreListPath)) {
    args.ignoreListPath = path.resolve(projectRoot, args.ignoreListPath);
  }

  return args;
}

function normalizeRelPath(p) {
  return String(p || "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .trim();
}

function detectCategory(relativePath) {
  const rel = relativePath.toLowerCase();
  const base = path.basename(rel);

  const byKeywords = [
    {
      category: "real_estate",
      keys: [
        "real_estate",
        "property",
        "mortgage",
        "lease",
        "rental",
        "nieruchom",
        "ksiega_wieczyst",
        "wieczyst",
        "mieszkan",
        "lokal",
        "najem",
        "akt_notarial",
      ],
    },
    {
      category: "telecom",
      keys: [
        "telecom",
        "internet",
        "mobile",
        "subscription",
        "upc",
        "play_telewizja",
        "play_internet",
      ],
    },
    {
      category: "business_plans",
      keys: [
        "business_plan",
        "businessplan",
        "biznesplan",
        "plan_biznes",
        "plan_dzialalnosci",
      ],
    },
    {
      category: "business_registration",
      keys: [
        "registration",
        "ceidg",
        "jdg",
        "wpis",
        "rejestracj",
        "dzialalnosci_gospodarczej",
      ],
    },
    {
      category: "reports",
      keys: ["report", "raport", "sprawozdanie"],
    },
    {
      category: "confirmations",
      keys: [
        "confirmation",
        "receipt",
        "potwierdzenie",
        "potwierdzenie_oplaty",
        "potwierdzenie_wysylki",
      ],
    },
    {
      category: "bank_statements",
      keys: [
        "bank_statement",
        "wyciag",
        "bank",
        "pko",
        "historia_rachunku",
        "platnosc",
        "trans_details",
      ],
    },
    { category: "surveys", keys: ["survey", "ankieta"] },
    { category: "invoices", keys: ["invoice", "faktura", "factur", "bill"] },
    {
      category: "contracts",
      keys: ["contract", "agreement", "umowa", "aneks"],
    },
    {
      category: "applications_and_decisions",
      keys: [
        "application",
        "decision",
        "permit",
        "residence",
        "wniosek",
        "decyzja",
        "zezwolenie",
        "wezwanie",
        "pobyt",
        "cudzoziemca",
      ],
    },
    {
      category: "powers_of_attorney",
      keys: ["power_of_attorney", "pelnomocnictwo", "pelnomoc", "upl"],
    },
    {
      category: "certificates",
      keys: ["certificate", "zaswiadczenie", "oswiadczenie", "zgoda", "rodo"],
    },
    {
      category: "taxes_and_social",
      keys: [
        "tax",
        "pit",
        "vat",
        "jpk",
        "jinp",
        "deklaracja",
        "zaliczka",
        "ewidencja",
        "zus",
        "dra",
        "upo",
        "upp",
        "zcna",
        "zza",
      ],
    },
    {
      category: "identity_documents",
      keys: [
        "passport",
        "paszport",
        "paspport",
        "id_card",
        "dowod",
        "karta",
        "wiza",
        "visa",
        "pesel",
      ],
    },
    {
      category: "scans_and_photos",
      keys: ["scan", "skan", "zdjecie", "img_", "photo", "camphoto"],
    },
  ];

  for (const rule of byKeywords) {
    if (rule.keys.some((key) => rel.includes(key) || base.includes(key))) {
      return rule.category;
    }
  }

  return "other";
}

function buildClassifySystemPrompt(existingFolders = []) {
  const lines = [
    "You are a document classifier. Based on the file content, choose the best folder name for this file.",
    "",
  ];

  if (existingFolders.length > 0) {
    lines.push(
      `Existing folders: ${existingFolders.join(", ")}`,
      "Prefer one of these folders if the file fits. You may propose a new folder name if none of them are appropriate.",
      "",
    );
  } else {
    lines.push(
      "No folders exist yet. Propose a short, descriptive folder name.",
      "",
    );
  }

  lines.push(
    "Folder naming rules:",
    "- snake_case, English, Latin alphabet only",
    "- 1 to 4 words, short and descriptive",
    "- Examples: invoices, tax_declarations, polish_documents, photos_people, utility_bills, bank_statements, identity_documents, contracts, medical_records",
    "",
    "Guidelines:",
    "- Photos of people (selfies, portraits, group photos) that are NOT document scans → photos_people or similar",
    "- Scanned documents or photos of documents → appropriate content-based folder, NOT a generic scans folder",
    "- If the document language is notable (e.g. all in Polish), you may reflect that in the folder name",
    "- If content is completely unreadable → unreadable_scans",
    "",
    'Reply with JSON: { "folder": "folder_name", "reason": "brief explanation" }',
  );

  return lines.join("\n");
}

async function getExistingFolders(outRootAbs) {
  try {
    const entries = await fs.readdir(outRootAbs, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".bmp": "image/bmp",
};

function sanitizeFolderName(raw) {
  return (
    raw
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "") || "other"
  );
}

function parseSmartResponse(resBody) {
  let rawResponse;
  if (typeof resBody === "string") {
    rawResponse = resBody;
  } else if (Array.isArray(resBody)) {
    rawResponse = resBody
      .map((p) => (typeof p === "string" ? p : p?.text || ""))
      .join(" ");
  } else {
    rawResponse = String(resBody ?? "");
  }
  rawResponse = rawResponse.trim();

  // Try to parse JSON response
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.folder) {
        return {
          folder: sanitizeFolderName(parsed.folder),
          reason: parsed.reason || "",
        };
      }
    } catch {
      // JSON parse failed, fall through to plain text extraction
    }
  }

  // Fallback: treat whole response as a folder name
  const folder = sanitizeFolderName(
    rawResponse.replace(/[^a-zA-Z0-9_ -]/g, ""),
  );
  return { folder, reason: "" };
}

async function detectCategorySmart({
  llm,
  visionLlm,
  absPath,
  relativePath,
  existingFolders,
}) {
  const ext = path.extname(absPath).toLowerCase();
  const isImage = IMAGE_EXTS.has(ext);
  const systemPrompt = buildClassifySystemPrompt(existingFolders);

  let res;

  if (isImage && visionLlm) {
    const imageData = await fs.readFile(absPath);
    const base64 = imageData.toString("base64");
    const mimeType = MIME_MAP[ext] || "image/jpeg";

    const message = new HumanMessage({
      content: [
        { type: "text", text: `${systemPrompt}\n\nFile: ${relativePath}` },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
      ],
    });
    res = await visionLlm.invoke([message]);
  } else {
    const content = await extractContent(absPath);
    const prompt = [
      systemPrompt,
      "",
      `File: ${relativePath}`,
      "Content (possibly partial):",
      content && content.trim().length > 0
        ? content.slice(0, 4000)
        : "[NO_TEXT_EXTRACTED — likely a photo or unreadable scan]",
    ].join("\n");
    res = await llm.invoke(prompt);
  }

  const { folder, reason } = parseSmartResponse(res?.content);
  if (reason) {
    console.log(`  → reason: ${reason}`);
  }
  return folder;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function withSuffix(fileName, n) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return `${base}__${n}${ext}`;
}

async function resolveUniqueDestination(
  absDestination,
  reservedDestinations = new Set(),
) {
  if (
    !reservedDestinations.has(absDestination) &&
    !(await exists(absDestination))
  )
    return absDestination;

  const dir = path.dirname(absDestination);
  const fileName = path.basename(absDestination);
  let index = 2;
  while (true) {
    const next = path.join(dir, withSuffix(fileName, index));
    if (!reservedDestinations.has(next) && !(await exists(next))) return next;
    index += 1;
  }
}

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [
    "from,to,category,action",
    ...rows.map((r) => [r.from, r.to, r.category, r.action].map(esc).join(",")),
  ].join("\n");
}

async function cleanupLegacyOutputs(outputsDir) {
  const entries = await fs.readdir(outputsDir, { withFileTypes: true });
  const legacy = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^organize-plan-.*\.(json|csv)$/i.test(name));

  await Promise.all(
    legacy.map((name) => fs.rm(path.join(outputsDir, name), { force: true })),
  );
}

async function cleanupTechnicalTempDirs(projectDir) {
  const names = ["tmp-apply-test", "tmp-person-test"];
  await Promise.all(
    names.map((name) =>
      fs.rm(path.join(projectDir, name), { recursive: true, force: true }),
    ),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetDir = path.resolve(args.targetDir);
  const outRootAbs = path.join(targetDir, args.outDirName);

  const all = await fg(args.include || include, {
    cwd: targetDir,
    ignore: defaultIgnore,
    onlyFiles: true,
    absolute: true,
    unique: true,
  });

  const files = all
    .map((absPath) => ({ absPath, relPath: path.relative(targetDir, absPath) }))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  const ignoredPaths = await readIgnoreList(args.ignoreListPath);
  const filesAfterIgnore = files.filter(
    (file) => !ignoredPaths.has(normalizeRelPath(file.relPath)),
  );
  const selected =
    args.limit > 0 ? filesAfterIgnore.slice(0, args.limit) : filesAfterIgnore;
  const outputsDir = path.join(path.resolve(process.cwd()), "outputs");
  await fs.mkdir(outputsDir, { recursive: true });
  await cleanupLegacyOutputs(outputsDir);
  await cleanupTechnicalTempDirs(path.resolve(process.cwd()));

  console.log(
    `Ignore list: ${args.ignoreListPath} (${ignoredPaths.size} entries)`,
  );

  let llm = null;
  let visionLlm = null;
  let visionDisabledReason = "";
  if (args.smart) {
    llm = buildChatModel(args);
    // Vision-мадэль для аналізу выяў (GPT-4o ці Gemini)
    const visionModel = process.env.VISION_MODEL || "gpt-4o";
    try {
      visionLlm = buildChatModel({ ...args, model: visionModel });
      console.log(`Smart mode: text=${args.model}, vision=${visionModel}`);
    } catch {
      console.log(
        `Smart mode: text=${args.model}, vision=disabled (no key for ${visionModel})`,
      );
      visionDisabledReason = `init failed for ${visionModel}`;
    }
  }

  const operations = [];
  const reservedDestinations = new Set();

  // Scan existing folders so the LLM can reuse them for consistency
  const existingFolders = new Set(await getExistingFolders(outRootAbs));
  if (args.smart && existingFolders.size > 0) {
    console.log(`Existing folders: ${[...existingFolders].join(", ")}`);
  }

  const failures = [];
  const totalSelected = selected.length;
  for (const [index, item] of selected.entries()) {
    const processed = index + 1;
    const remaining = totalSelected - processed;
    const progress = `[${processed}/${totalSelected}, left=${remaining}]`;

    try {
      let category;
      if (args.smart) {
        try {
          category = await detectCategorySmart({
            llm,
            visionLlm,
            absPath: item.absPath,
            relativePath: item.relPath,
            existingFolders: [...existingFolders],
          });
          existingFolders.add(category);
          console.log(`${progress} Classified: ${item.relPath} -> ${category}`);
        } catch (err) {
          const errMsg = String(err?.message || err || "");
          const isVisionNotFound =
            visionLlm && /model\s+['"].+['"]\s+not\s+found/i.test(errMsg);

          if (isVisionNotFound) {
            visionLlm = null;
            visionDisabledReason = errMsg;
            console.error(
              `${progress} Vision model unavailable (${errMsg}). Falling back to OCR/text classification for remaining files.`,
            );
            try {
              category = await detectCategorySmart({
                llm,
                visionLlm: null,
                absPath: item.absPath,
                relativePath: item.relPath,
                existingFolders: [...existingFolders],
              });
              existingFolders.add(category);
              console.log(
                `${progress} Classified via OCR/text fallback: ${item.relPath} -> ${category}`,
              );
            } catch (fallbackErr) {
              console.error(
                `${progress} OCR/text fallback failed for ${item.relPath}: ${fallbackErr.message}`,
              );
              category = detectCategory(item.relPath);
            }
          } else {
            console.error(
              `${progress} Smart classify failed for ${item.relPath}: ${errMsg}`,
            );
            category = detectCategory(item.relPath);
          }
        }
      } else {
        category = detectCategory(item.relPath);
      }
      const destDirAbs = path.join(outRootAbs, category);
      const desiredAbs = path.join(destDirAbs, path.basename(item.absPath));
      const finalAbs = await resolveUniqueDestination(
        desiredAbs,
        reservedDestinations,
      );
      reservedDestinations.add(finalAbs);

      const toRel = path.relative(targetDir, finalAbs);
      const samePath = path.resolve(item.absPath) === path.resolve(finalAbs);

      operations.push({
        from: item.relPath,
        to: toRel,
        category,
        action: samePath ? "skip" : "move",
        fromAbs: item.absPath,
        toAbs: finalAbs,
      });
    } catch (err) {
      const errMsg = String(err?.message || err || "");
      console.error(`${progress} FAILED: ${item.relPath}: ${errMsg}`);
      failures.push({ file: item.relPath, error: errMsg });
    }
  }

  const toMove = operations.filter((o) => o.action === "move");

  if (!args.dryRun) {
    console.log(`\nMoving ${toMove.length} files...`);
    const totalToMove = toMove.length;
    let moved = 0;
    for (const [index, op] of toMove.entries()) {
      const processed = index + 1;
      const remaining = totalToMove - processed;
      const progress = `[${processed}/${totalToMove}, left=${remaining}]`;
      try {
        await fs.mkdir(path.dirname(op.toAbs), { recursive: true });
        await fs.rename(op.fromAbs, op.toAbs);
        moved += 1;
        console.log(`${progress} Moved: ${op.from} -> ${op.to}`);

        if (args.updateIgnoreList) {
          const processedPath = op.action === "move" ? op.to : op.from;
          await appendIgnoreEntries(args.ignoreListPath, [processedPath]);
        }
      } catch (err) {
        console.error(
          `${progress} MOVE FAILED: ${op.from}: ${err.message || err}`,
        );
        failures.push({
          file: op.from,
          error: `move failed: ${err.message || err}`,
        });
      }
    }
    if (moved < totalToMove) {
      console.log(
        `\nMoved ${moved}/${totalToMove} (${totalToMove - moved} failed)`,
      );
    }
  } else {
    console.log(`\nDry-run plan (${toMove.length} files to move):`);
    for (const op of toMove) {
      console.log(`  ${op.from} -> ${op.to}  [${op.category}]`);
    }
    const skipped = operations.filter((o) => o.action === "skip");
    if (skipped.length > 0) {
      console.log(`  (${skipped.length} files already in place)`);
    }
  }

  const jsonPath = path.join(outputsDir, "organize-plan.json");
  const csvPath = path.join(outputsDir, "organize-plan.csv");

  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        targetDir,
        outDir: path.relative(targetDir, outRootAbs),
        dryRun: args.dryRun,
        totalScanned: files.length,
        totalSelected: selected.length,
        totalIgnored: files.length - filesAfterIgnore.length,
        totalMove: toMove.length,
        totalFailed: failures.length,
        smartMode: args.smart
          ? {
              textModel: args.model,
              visionEnabled: Boolean(visionLlm),
              visionDisabledReason: visionDisabledReason || null,
            }
          : null,
        operations: operations.map(({ fromAbs, toAbs, ...rest }) => rest),
        failures: failures.length > 0 ? failures : undefined,
      },
      null,
      2,
    ),
    "utf8",
  );

  await fs.writeFile(
    csvPath,
    toCsv(operations.map(({ fromAbs, toAbs, ...rest }) => rest)),
    "utf8",
  );

  console.log(`\nScanned: ${files.length}`);
  console.log(`Ignored by list: ${files.length - filesAfterIgnore.length}`);
  console.log(`Selected: ${selected.length}`);
  console.log(`Move operations: ${toMove.length}`);
  if (failures.length > 0) {
    console.log(`Failed: ${failures.length}`);
  }
  console.log(`Mode: ${args.dryRun ? "dry-run" : "apply"}`);
  console.log(`Out root: ${outRootAbs}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV: ${csvPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
