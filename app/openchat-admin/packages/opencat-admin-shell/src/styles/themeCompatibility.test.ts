import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesSource = readFileSync(path.resolve(__dirname, 'index.css'), 'utf8');

describe('theme compatibility layer', () => {
  it('maps legacy slate and white utility classes onto the shell token system', () => {
    expect(stylesSource).toContain('.text-slate-900');
    expect(stylesSource).toContain('.text-slate-500');
    expect(stylesSource).toContain('.border-slate-200');
    expect(stylesSource).toContain('.bg-slate-950');
    expect(stylesSource).toContain('.bg-white\\/80');
  });
});
