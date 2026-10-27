/** Writes the OpenAPI document to docs/openapi.json (npm run openapi:export). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openApiDocument } from '../src/docs/openapi';

const out = join(__dirname, '..', 'docs', 'openapi.json');
mkdirSync(join(__dirname, '..', 'docs'), { recursive: true });
writeFileSync(out, `${JSON.stringify(openApiDocument, null, 2)}\n`);
console.log(`OpenAPI written to ${out}`);
