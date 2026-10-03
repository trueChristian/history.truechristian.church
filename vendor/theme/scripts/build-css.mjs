import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = await readFile(path.join(root, "src/css/theme.css"), "utf8");
const modules = [...entry.matchAll(/@import\s+["']\.\/([^"']+)["'];?/g)].map((match) => match[1]);
const headerScript = "site-header.js";

if (!modules.length) throw new Error("src/css/theme.css contains no module imports.");

const sections = [];
for (const file of modules) {
  const css = await readFile(path.join(root, "src/css", file), "utf8");
  sections.push(`/* ${file} */\n${css.trim()}\n`);
}

const banner = "/* True Christian Church unified theme. Generated from src/css; do not edit dist directly. */\n";
const compiled = banner + sections.join("\n");

function minifyCss(input) {
  let output = "";
  let quote = "";
  let inComment = false;
  let pendingSpace = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (inComment) {
      if (character === "*" && next === "/") {
        inComment = false;
        pendingSpace = true;
        index += 1;
      }
      continue;
    }

    if (quote) {
      output += character;
      if (character === "\\" && next) {
        output += next;
        index += 1;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }

    if (character === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }

    if (character === '"' || character === "'") {
      if (pendingSpace && output && !"{:;,>".includes(output.at(-1))) output += " ";
      pendingSpace = false;
      quote = character;
      output += character;
      continue;
    }

    if (/\s/.test(character)) {
      pendingSpace = true;
      continue;
    }

    if ("{}:;,>".includes(character)) {
      if (output.endsWith(" ")) output = output.slice(0, -1);
      output += character;
      pendingSpace = false;
      continue;
    }

    if (pendingSpace && output && !"{:;,>".includes(output.at(-1))) output += " ";
    pendingSpace = false;
    output += character;
  }

  return output.trim();
}

const minified = minifyCss(compiled);

await mkdir(path.join(root, "dist"), { recursive: true });
await writeFile(path.join(root, "dist/truechristian-theme.css"), compiled);
await writeFile(path.join(root, "dist/truechristian-theme.min.css"), `${minified}\n`);
await writeFile(
  path.join(root, "dist/truechristian-theme.js"),
  await readFile(path.join(root, "src/js", headerScript), "utf8")
);

console.log(`Built ${modules.length} CSS modules and ${headerScript}.`);
