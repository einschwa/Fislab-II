#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const modulDir = path.join(root, 'modul');
const outDir = path.join(root, 'public', 'modul-html');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Mapping from logical IDs used by viewer to source filenames in modul/MP and modul/W
const MP_MAP = {
  MP1: 'Konstanta_Planck.tex',
  MP2: 'Milikan.tex',
  MP3: 'Hysteresis_Magnet.tex',
  MP4: 'Radioaktivitas.tex',
  MP5: 'Franck_Hertz.tex'
};

const W_MAP = {
  W1: 'Difraksi.tex',
  W2: 'Polarisasi.tex',
  W3: 'Spektroskopi.tex',
  W4: 'Gelombang_Mekanik.tex',
  W5: 'Cincin_Newton.tex'
};

// Additional single-file modules (root of modul/)
const OTHER_MAP = {
  Data: 'Pengolahan_Data.tex'
};

function runPandoc(srcPath, dstPath) {
  const args = ['-f', 'latex', '-t', 'html', '--mathjax', '-o', dstPath, srcPath];
  const res = spawnSync('pandoc', args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    console.error('pandoc failed:', res.stderr);
    throw new Error('pandoc conversion failed');
  }
}

function postprocessHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  // Remove any injected MathJax script tags from pandoc output
  html = html.replace(/<script[^>]*src=["'][^"']*mathjax[^"']*["'][^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]*>\s*window\.MathJax[^<]*<\/script>/gi, '');

  // Adjust image paths: make any local image path that contains 'Gambar' point to 'modul/Gambar/'
  html = html.replace(/src=["'](?:\.\/|\.\.\/)?([^"']*Gambar\/)?([^"']+?)["']/gi, (m, p1, filename) => {
    // if p1 present, keep only filename; otherwise use filename as-is
    if (!filename) return m;
    const newPath = `modul/Gambar/${filename}`;
    return `src="${newPath.replace(/\\\\/g, '/')}"`;
  });

  // Ensure relative links to images or files use forward slashes
  html = html.replace(/src="([^"]+)"/g, (m, p1) => `src="${p1.replace(/\\\\/g, '/')}"`);

  fs.writeFileSync(filePath, html, 'utf8');
}

function convertMap(mapLookup, folder) {
  Object.entries(mapLookup).forEach(([id, filename]) => {
    const src = path.join(modulDir, folder, filename);
    const dst = path.join(outDir, `${id}.html`);
    if (!fs.existsSync(src)) {
      console.warn(`Source not found for ${id}: ${src}`);
      // create a small placeholder
      fs.writeFileSync(dst, `<p>Modul ${id} belum tersedia (sumber ${filename} tidak ditemukan).</p>`, 'utf8');
      return;
    }
    try {
      console.log(`Converting ${src} → ${dst}`);
      runPandoc(src, dst);
      postprocessHtml(dst);
    } catch (e) {
      console.error('Failed to convert', src, e);
    }
  });
}

function main() {
  convertMap(MP_MAP, 'MP');
  convertMap(W_MAP, 'W');
  convertMap(OTHER_MAP, '');
  console.log('Conversion finished. Output in', outDir);
}

if (require.main === module) main();
