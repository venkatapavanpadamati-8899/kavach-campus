import * as fs from 'fs';
import * as path from 'path';

const dir = 'supabase/migrations';
const files = fs.readdirSync(dir).filter(f => f.match(/^0(0[1-9]|1[0-4])_.*\.sql$/)).sort();

console.log(`Found ${files.length} baseline migration files:`);
const inventory = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n');
  const creates = lines.filter(l => l.match(/CREATE TABLE/i)).map(l => l.trim());
  const alters = lines.filter(l => l.match(/ALTER TABLE.*ADD/i)).map(l => l.trim());
  const functions = lines.filter(l => l.match(/CREATE OR REPLACE FUNCTION/i)).map(l => l.trim());
  const policies = lines.filter(l => l.match(/CREATE POLICY/i)).map(l => l.trim());
  const drops = lines.filter(l => l.match(/DROP/i)).map(l => l.trim());

  inventory.push({
    file,
    size: content.length,
    creates,
    alters,
    functions,
    policiesCount: policies.length,
    sampleLines: lines.slice(0, 10).filter(l => l.startsWith('--') || l.trim().length > 0).slice(0, 3)
  });
}

fs.writeFileSync('scripts/baseline_migrations_inventory.json', JSON.stringify(inventory, null, 2));
console.log('Saved to scripts/baseline_migrations_inventory.json');
inventory.forEach(inv => {
  console.log(`\n=== ${inv.file} (${inv.size} bytes) ===`);
  if (inv.creates.length) console.log('  Creates:', inv.creates);
  if (inv.alters.length) console.log('  Alters:', inv.alters);
  if (inv.functions.length) console.log('  Functions:', inv.functions);
  console.log(`  Policies: ${inv.policiesCount}`);
});

