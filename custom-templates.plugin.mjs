/**
 * Syncs src/environments/custom_templates.json into angular.json fileReplacements.
 * Run with: node custom-templates.plugin.mjs
 *           npm run sync-templates
 *
 * If custom_templates.json does not exist, all template overrides are cleared.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const jsonPath = resolve(__dirname, 'src/environments/custom_templates.json');

let templates = [];
if (existsSync(jsonPath)) {
  templates = JSON.parse(readFileSync(jsonPath, 'utf-8'));
}

const templateReplacements = templates.map(({ default_template, template }) => ({
  replace: default_template,
  with: template,
}));

const angularJsonPath = resolve(__dirname, 'angular.json');
const angularJson = JSON.parse(readFileSync(angularJsonPath, 'utf-8'));

const buildConfig = angularJson.projects['cuento-frontend'].architect.build.configurations;

const envReplacement = { replace: 'src/environments/environment.ts', with: 'src/environments/environment.prod.ts' };
buildConfig.production.fileReplacements = [envReplacement, ...templateReplacements];

buildConfig.development = buildConfig.development ?? {};
if (templateReplacements.length) {
  buildConfig.development.fileReplacements = templateReplacements;
} else {
  delete buildConfig.development.fileReplacements;
}

writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2) + '\n');

console.log(`[sync-templates] ${templateReplacements.length} template replacement(s) applied.`);
console.log('[sync-templates] angular.json updated.');
