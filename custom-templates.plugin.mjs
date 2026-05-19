/**
 * Syncs customTemplates from environment files into angular.json fileReplacements.
 * Run with: node custom-templates.plugin.mjs
 *
 * Add to package.json scripts:
 *   "presync-templates": never needed — call this explicitly before committing env changes.
 *   "sync-templates": "node custom-templates.plugin.mjs"
 *
 * The production fileReplacements in angular.json are kept in sync so that
 * `ng build --configuration production` works without any extra steps.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseCustomTemplates(envContent) {
  const match = envContent.match(/customTemplates:\s*(\[[\s\S]*?\])/);
  if (!match) return [];

  let arrayStr = match[1].trim();
  if (arrayStr === '[]') return [];

  arrayStr = arrayStr
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

  try {
    return JSON.parse(arrayStr);
  } catch (e) {
    console.warn('[sync-templates] Could not parse customTemplates:', e.message);
    return [];
  }
}

const angularJsonPath = resolve(__dirname, 'angular.json');
const angularJson = JSON.parse(readFileSync(angularJsonPath, 'utf-8'));

const buildConfig = angularJson.projects['cuento-frontend'].architect.build.configurations;

// --- production ---
const prodEnv = readFileSync(resolve(__dirname, 'src/environments/environment.prod.ts'), 'utf-8');
const prodTemplates = parseCustomTemplates(prodEnv);

const envReplacement = { replace: 'src/environments/environment.ts', with: 'src/environments/environment.prod.ts' };
const prodTemplateReplacements = prodTemplates.map(({ component, template }) => ({
  replace: component,
  with: template,
}));
buildConfig.production.fileReplacements = [envReplacement, ...prodTemplateReplacements];

// --- development ---
const devEnv = readFileSync(resolve(__dirname, 'src/environments/environment.ts'), 'utf-8');
const devTemplates = parseCustomTemplates(devEnv);

const devTemplateReplacements = devTemplates.map(({ component, template }) => ({
  replace: component,
  with: template,
}));
buildConfig.development = buildConfig.development ?? {};
buildConfig.development.fileReplacements = devTemplateReplacements.length ? devTemplateReplacements : undefined;
if (!buildConfig.development.fileReplacements) delete buildConfig.development.fileReplacements;

writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2) + '\n');

console.log(`[sync-templates] Production: ${prodTemplateReplacements.length} template replacement(s)`);
console.log(`[sync-templates] Development: ${devTemplateReplacements.length} template replacement(s)`);
console.log('[sync-templates] angular.json updated.');
