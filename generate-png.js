import fs from 'fs';
import path from 'path';

// This script will scan the local folders to find any user-uploaded PNG files to /public/favicon.png.
// It will help us debug if the uploaded file is hidden somewhere or if we need to copy it.
function scanForPngs(dir, results = [], depth = 0) {
  if (depth > 6) return results;
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
      const fullPath = path.join(dir, f);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
        scanForPngs(fullPath, results, depth + 1);
      } else if (f.toLowerCase().endsWith('.png')) {
        results.push({
          path: fullPath,
          size: stat.size,
          mtime: stat.mtime
        });
      }
    }
  } catch (err) {
    // Keep scanning other readable directories
  }
  return results;
}

async function convert() {
  console.log('--- SCANNING FOR ANY PNG FILES IN THE SYSTEM ---');
  const pngs = [];
  scanForPngs(process.cwd(), pngs);
  scanForPngs('/tmp', pngs);
  
  console.log(`Found ${pngs.length} PNG files in total:`);
  for (const png of pngs) {
    console.log(`- Path: ${png.path}, Size: ${png.size} bytes, Modified: ${png.mtime}`);
  }
  console.log('------------------------------------------------');
}

convert();





