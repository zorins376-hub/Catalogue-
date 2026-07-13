import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Ghostscript CMYK conversion service (ТЗ §7).
 *
 * Runs inside a Cloudflare Container. The Worker POSTs an RGB PDF (produced by
 * Browser Rendering) and the target page geometry; we convert to DeviceCMYK and
 * stamp TrimBox/BleedBox from the bleed box, then return the print-ready PDF.
 *
 *   POST /convert?mediaWmm=216&mediaHmm=303&bleedMm=3   body: application/pdf
 *   GET  /health
 *
 * Crop marks are NOT drawn here — the trim/bleed boxes let the printer (or a
 * later gs pass) place them. A Coated FOGRA39 ICC profile is used when present
 * at ICC_PROFILE_PATH (kept out of the image for licensing; mount or bake it in).
 */

const PORT = Number(process.env.PORT ?? 8080);
const GS = process.env.GS_BIN ?? 'gs';
const ICC_PROFILE_PATH = process.env.ICC_PROFILE_PATH ?? '/opt/icc/CoatedFOGRA39.icc';
const PT_PER_MM = 72 / 25.4;

function boxes(mediaWmm, mediaHmm, bleedMm) {
  const w = mediaWmm * PT_PER_MM;
  const h = mediaHmm * PT_PER_MM;
  const off = bleedMm * PT_PER_MM;
  const f = (n) => n.toFixed(4);
  return {
    // TrimBox = finished page (media minus bleed on every side)
    trim: `[ ${f(off)} ${f(off)} ${f(w - off)} ${f(h - off)} ]`,
    // BleedBox = full media box
    bleed: `[ 0 0 ${f(w)} ${f(h)} ]`,
  };
}

async function iccExists() {
  try {
    await readFile(ICC_PROFILE_PATH);
    return true;
  } catch {
    return false;
  }
}

async function convert(input, mediaWmm, mediaHmm, bleedMm) {
  const dir = await mkdtemp(join(tmpdir(), 'gs-'));
  const inPath = join(dir, 'in.pdf');
  const outPath = join(dir, 'out.pdf');
  try {
    await writeFile(inPath, input);
    const { trim, bleed } = boxes(mediaWmm, mediaHmm, bleedMm);

    const args = [
      '-q',
      '-dSAFER',
      '-dBATCH',
      '-dNOPAUSE',
      '-sDEVICE=pdfwrite',
      '-dProcessColorModel=/DeviceCMYK',
      '-sColorConversionStrategy=CMYK',
      '-dAutoRotatePages=/None',
      // Preserve print intent; do not downsample images.
      '-dDownsampleColorImages=false',
      '-dDownsampleGrayImages=false',
      '-dDownsampleMonoImages=false',
    ];
    if (await iccExists()) {
      // Real ICC output intent (Coated FOGRA39) when the profile is available.
      args.push('-sOutputICCProfile=' + ICC_PROFILE_PATH, '-dOverrideICC=true');
    }
    args.push(
      '-o',
      outPath,
      // /PAGES pdfmark sets boxes on the page tree → inherited by every page.
      '-c',
      `[ /TrimBox ${trim} /BleedBox ${bleed} /PAGES pdfmark`,
      '-f',
      inPath,
    );

    await new Promise((resolve, reject) => {
      execFile(GS, args, { maxBuffer: 1 << 30 }, (err, _stdout, stderr) => {
        if (err) reject(new Error(`ghostscript failed: ${stderr || err.message}`));
        else resolve(null);
      });
    });
    return await readFile(outPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url?.startsWith('/health')) {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  if (req.method !== 'POST' || !req.url?.startsWith('/convert')) {
    res.writeHead(404).end('not found');
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const mediaWmm = Number(url.searchParams.get('mediaWmm') ?? 216);
  const mediaHmm = Number(url.searchParams.get('mediaHmm') ?? 303);
  const bleedMm = Number(url.searchParams.get('bleedMm') ?? 3);

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    try {
      const pdf = await convert(Buffer.concat(chunks), mediaWmm, mediaHmm, bleedMm);
      res.writeHead(200, { 'content-type': 'application/pdf', 'content-length': pdf.length });
      res.end(pdf);
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(e instanceof Error ? e.message : 'convert failed');
    }
  });
});

server.listen(PORT, () => console.log(`gs-container listening on :${PORT}`));
