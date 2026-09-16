import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

/**
 * Copies pure domain modules into supabase/functions/_shared so Edge
 * Functions can import them.
 *
 * Deno cannot reach into src/, but hand-duplicating this logic would let the
 * copy running in production drift from the copy that has tests. The source
 * of truth is always src/domain.
 */
const MODULES = ['upstream-feed', 'alert-engine', 'types'];

mkdirSync('supabase/functions/_shared', { recursive: true });

for (const name of MODULES) {
  const source = readFileSync(`src/domain/${name}.ts`, 'utf8');
  writeFileSync(
    `supabase/functions/_shared/${name}.ts`,
    `// GENERATED FILE — do not edit.\n` +
      `// Synced from src/domain/${name}.ts by \`npm run sync:functions\`.\n` +
      `// The source of truth lives there because that is where its tests run.\n\n` +
      source.replace(/from '\.\/([a-z-]+)'/g, "from './$1.ts'")
  );
  console.log(`synced ${name}`);
}
