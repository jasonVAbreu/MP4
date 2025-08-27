const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const { getStream } = require('puppeteer-stream');
const ffmpegPath = require('ffmpeg-static');

const app = express();
app.use(express.json({ limit: '12mb' }));

async function recordPageToMp4(page, {
  width = 1080,
  height = 1920,
  fps = 30,
  durationMs = 5000,
  outputPath
} = {}) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  const stream = await getStream(page, { audio: false, video: true, fps });

  const args = [
    '-y',
    '-i', 'pipe:0',
    '-movflags', 'faststart',
    '-r', String(fps),
    '-pix_fmt', 'yuv420p',
    '-vcodec', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    outputPath
  ];
  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'inherit', 'inherit'] });

  stream.pipe(ff.stdin);

  await new Promise(res => setTimeout(res, durationMs));

  stream.destroy();
  try { ff.stdin.end(); } catch (e) {}

  await new Promise((resolve, reject) => {
    ff.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg exited with code ' + code)));
  });
}

app.post('/mp4/from-html', async (req, res) => {
  const {
    html,
    width = 1080,
    height = 1080,
    fps = 30,
    durationMs = 6000,
    waitUntil = 'networkidle0',
    deviceScaleFactor = 1
  } = req.body || {};

  if (!html) return res.status(400).json({ error: 'Falta el campo "html".' });

  const tmpOut = path.join(os.tmpdir(), `render_${Date.now()}.mp4`);
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });
    await page.setContent(html, { waitUntil });
    await page.waitForTimeout(300);

    await recordPageToMp4(page, { width, height, fps, durationMs, outputPath: tmpOut });

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="render.mp4"');
    fs.createReadStream(tmpOut)
      .on('close', () => fs.unlink(tmpOut, () => {}))
      .pipe(res);
  } catch (err) {
    console.error(err);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.post('/mp4/from-url', async (req, res) => {
  const {
    url,
    width = 1080,
    height = 1080,
    fps = 30,
    durationMs = 6000,
    waitUntil = 'networkidle0',
    deviceScaleFactor = 1
  } = req.body || {};

  if (!url) return res.status(400).json({ error: 'Falta el campo "url".' });

  const tmpOut = path.join(os.tmpdir(), `render_${Date.now()}.mp4`);
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });
    await page.goto(url, { waitUntil });
    await page.waitForTimeout(300);

    await recordPageToMp4(page, { width, height, fps, durationMs, outputPath: tmpOut });

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="render.mp4"');
    fs.createReadStream(tmpOut)
      .on('close', () => fs.unlink(tmpOut, () => {}))
      .pipe(res);
  } catch (err) {
    console.error(err);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/health', (_, res) => res.send('OK'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));
