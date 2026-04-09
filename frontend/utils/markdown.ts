import markdownit from "markdown-it";
import type { HighlighterCore, LanguageInput } from "@shikijs/types";

const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

let highlighterReady = false;
let highlighterPromise: Promise<void> | null = null;
let highlighter: HighlighterCore | null = null;
const loadedLanguages = new Set<string>();

const shouldHighlight = (content: string) => /```/.test(content);

const languageLoaders = {
  c: () => import("shiki/langs/c.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  shellscript: () => import("shiki/langs/shellscript.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  xml: () => import("shiki/langs/xml.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  go: () => import("shiki/langs/go.mjs"),
};

type SupportedLanguage = keyof typeof languageLoaders;

const languageAliases: Record<string, SupportedLanguage> = {
  c: "c",
  css: "css",
  go: "go",
  html: "html",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  py: "python",
  python: "python",
  sh: "shellscript",
  shell: "shellscript",
  shellscript: "shellscript",
  bash: "shellscript",
  sql: "sql",
  ts: "typescript",
  tsx: "tsx",
  typescript: "typescript",
  xml: "xml",
  yml: "yaml",
  yaml: "yaml",
};

const extractRequestedLanguages = (content: string): SupportedLanguage[] => {
  const matches = content.matchAll(/```([^\s`]+)/g);
  const langs = new Set<SupportedLanguage>();

  for (const match of matches) {
    const rawLang = match[1]?.toLowerCase();
    if (!rawLang) {
      continue;
    }

    const normalized = languageAliases[rawLang];
    if (normalized) {
      langs.add(normalized);
    }
  }

  return [...langs];
};

export const ensureMarkdownHighlighter = async (content: string) => {
  if (!import.meta.client || highlighterReady || !shouldHighlight(content)) {
    return;
  }

  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [{ fromHighlighter }, { createHighlighterCore }] = await Promise.all([
        import("@shikijs/markdown-it/core"),
        import("shiki/core"),
      ]);

      highlighter = await createHighlighterCore({
        themes: [import("shiki/themes/github-dark.mjs")],
        loadWasm: import("shiki/wasm"),
      });

      md.use(fromHighlighter(highlighter, {
        themes: {
          light: "github-dark",
          dark: "github-dark",
        },
      }));
    })();
  }

  await highlighterPromise;

  const requestedLanguages = extractRequestedLanguages(content).filter((lang) => !loadedLanguages.has(lang));
  if (requestedLanguages.length > 0 && highlighter) {
    const languageModules = await Promise.all(
      requestedLanguages.map((lang) => languageLoaders[lang]())
    );

    await highlighter.loadLanguage(...(languageModules as LanguageInput[]));
    requestedLanguages.forEach((lang) => loadedLanguages.add(lang));
  }

  highlighterReady = true;
};

export const renderMarkdown = (content: string) => {
  return md.render(content);
};
