import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseCustomTemplates(envContent) {
  const match = envContent.match(/customTemplates:\s*(\[[\s\S]*?\])/);
  if (!match) return [];

  let arrayStr = match[1].trim();
  if (arrayStr === '[]') return [];

  // Convert TS object literal to JSON
  arrayStr = arrayStr
    .replace(/'/g, '"')                 // single → double quotes
    .replace(/,(\s*[}\]])/g, '$1')      // trailing commas
    .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // unquoted keys

  try {
    return JSON.parse(arrayStr);
  } catch (e) {
    console.warn('[custom-templates] Could not parse customTemplates:', e.message);
    return [];
  }
}

export default {
  name: 'custom-templates',
  setup(build) {
    const isProd = process.env['NODE_ENV'] === 'production';
    const envFile = isProd
      ? join(__dirname, 'src/environments/environment.prod.ts')
      : join(__dirname, 'src/environments/environment.ts');

    let customTemplates = [];
    try {
      customTemplates = parseCustomTemplates(readFileSync(envFile, 'utf-8'));
    } catch {
      return;
    }

    if (!customTemplates.length) return;

    // Map: absolute path of default template → absolute path of custom template
    const replacements = new Map(
      customTemplates.map(({ component, template }) => [
        resolve(__dirname, component),
        resolve(__dirname, template),
      ])
    );

    build.onResolve({ filter: /\.html$/ }, (args) => {
      if (!args.importer) return null;
      const resolved = resolve(dirname(args.importer), args.path);
      const replacement = replacements.get(resolved);
      return replacement ? { path: replacement } : null;
    });
  },
};
