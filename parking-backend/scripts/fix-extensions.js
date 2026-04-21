const fs = require('fs').promises;
const path = require('path');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const res = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(res);
    } else if (ent.isFile() && res.endsWith('.js')) {
      await fixFile(res);
    }
  }
}

async function fixFile(file) {
  let content = await fs.readFile(file, 'utf8');
  // Replace import/export specifiers that are relative and missing an extension
  // Match 'from "./x"', 'from "../x"', 'import "./x"', 'export * from "./x"'
  const regex = /([\n\r\t\s])((?:import|from|export)\s*(?:\*\s*from\s*|(?:[\s\S]*?)from\s*)?)['"](\.{1,2}\/[^'"\n\r]+?)['"]/g;
  content = content.replace(regex, (m, p1, p2, spec) => {
    // don't add extension for urls or package-like imports
    if (spec.startsWith('node:')) return m;
    if (spec.endsWith('.js') || spec.endsWith('.json') || spec.endsWith('.mjs')) return m;
    // if spec points to a directory index (ends with /) skip
    if (spec.endsWith('/')) return m;
    return `${p1}${p2}'${spec}.js'`;
  });

  // Also handle bare import("../foo") dynamic imports
  const dynRegex = /import\(\s*['"](\.{1,2}\/[^'"\)\n\r]+?)['"]\s*\)/g;
  content = content.replace(dynRegex, (m, spec) => {
    if (spec.endsWith('.js') || spec.endsWith('.json') || spec.endsWith('.mjs')) return m;
    return `import('${spec}.js')`;
  });

  await fs.writeFile(file, content, 'utf8');
}

(async () => {
  const dist = path.join(__dirname, '..', 'dist');
  try {
    await fs.access(dist);
  } catch (e) {
    console.log('No dist/ directory found — skipping extension fixes.');
    return;
  }
  await walk(dist);
  console.log('Fixed relative import/export specifiers in dist/*.js');
})();
