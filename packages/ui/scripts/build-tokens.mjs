// Writes src/styles/tokens.css from src/tokens/tokens.ts. Node strips the types.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderTokensCss } from "../src/tokens/tokens.ts";

const target = fileURLToPath(new URL("../src/styles/tokens.css", import.meta.url));
writeFileSync(target, renderTokensCss());
console.log(`wrote ${target}`);
