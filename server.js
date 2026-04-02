const express = require('express');
const puppeteer = require('puppeteer-core');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3847;
const CHROME_PATH = '/usr/bin/google-chrome';
const WALLET = '0xD65F99cBB9eAba24f2A3aF2e046875c84048909e';

// Rate limiting (simple in-memory)
const rateLimit = {};
const RATE_LIMIT_FREE = 10; // free requests per IP per day

function checkRateLimit(ip) {
  const today = new Date().toISOString().split('T')[0];
  const key = `${ip}:${today}`;
  rateLimit[key] = (rateLimit[key] || 0) + 1;
  return rateLimit[key] <= RATE_LIMIT_FREE;
}

// Launch browser once
let browser;
async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browser;
}

// --- ENDPOINTS ---

// Landing page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SnapAPI — Screenshot & PDF Service</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; min-height: 100vh; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2.5rem; margin-bottom: 8px; background: linear-gradient(135deg, #a78bfa, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #888; font-size: 1.1rem; margin-bottom: 40px; }
    .endpoint { background: #141414; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .method { display: inline-block; background: #7c3aed; color: white; padding: 2px 10px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; margin-right: 8px; }
    .path { font-family: monospace; color: #a78bfa; font-size: 1rem; }
    .desc { color: #999; margin-top: 8px; font-size: 0.95rem; }
    code { background: #1a1a2e; padding: 12px 16px; border-radius: 8px; display: block; margin-top: 12px; font-size: 0.85rem; overflow-x: auto; white-space: pre; color: #ccc; }
    .pricing { background: #141414; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-top: 40px; }
    .pricing h2 { color: #a78bfa; margin-bottom: 12px; }
    .wallet { font-family: monospace; font-size: 0.85rem; color: #f472b6; word-break: break-all; }
    a { color: #a78bfa; }
    .free-badge { display: inline-block; background: #065f46; color: #6ee7b7; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌸 SnapAPI</h1>
    <p class="subtitle">Fast screenshot & PDF generation API. Free tier available. Pay with crypto.</p>

    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path">/screenshot?url=https://example.com</span>
      <p class="desc">Capture a full-page screenshot of any URL. Returns PNG image.</p>
      <code>curl "http://${req.headers.host}/screenshot?url=https://example.com&width=1280&fullPage=true" -o screenshot.png</code>
    </div>

    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path">/pdf?url=https://example.com</span>
      <p class="desc">Generate a PDF from any URL. Returns PDF file.</p>
      <code>curl "http://${req.headers.host}/pdf?url=https://example.com&format=A4" -o page.pdf</code>
    </div>

    <div class="endpoint">
      <span class="method">POST</span>
      <span class="path">/html-to-image</span>
      <p class="desc">Render custom HTML to PNG. Send HTML in request body.</p>
      <code>curl -X POST "http://${req.headers.host}/html-to-image" -H "Content-Type: text/html" -d "&lt;h1&gt;Hello World&lt;/h1&gt;" -o output.png</code>
    </div>

    <div class="pricing">
      <h2>Pricing</h2>
      <p><span class="free-badge">FREE</span> ${RATE_LIMIT_FREE} requests/day per IP</p>
      <p style="margin-top: 12px;">Need more? Send any amount of USDT (ERC-20/BSC/Polygon) to unlock unlimited access:</p>
      <p class="wallet" style="margin-top: 8px;">${WALLET}</p>
      <p style="margin-top: 12px; color: #666;">Contact: Include your IP or API key request in the transaction memo, or open an issue on <a href="https://github.com/tunnox-net/snapapi">GitHub</a>.</p>
    </div>
    
    <p style="margin-top: 30px; color: #555; font-size: 0.85rem;">Built by an autonomous AI agent 🌸 | <a href="https://github.com/tunnox-net/snapapi">Source</a></p>
  </div>
</body>
</html>
  `);
});

// Screenshot endpoint
app.get('/screenshot', async (req, res) => {
  const { url, width = 1280, height = 720, fullPage = 'false' } = req.query;
  if (!url) return res.status(400).json({ error: 'url parameter required' });

  if (!checkRateLimit(req.ip)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Free tier: 10 requests/day.',
      wallet: WALLET,
      upgrade: 'Send USDT to wallet for unlimited access'
    });
  }

  try {
    const b = await getBrowser();
    const page = await b.newPage();
    await page.setViewport({ width: parseInt(width), height: parseInt(height) });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const screenshot = await page.screenshot({ 
      fullPage: fullPage === 'true',
      type: 'png'
    });
    await page.close();
    
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', 'inline; filename="screenshot.png"');
    res.send(screenshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF endpoint
app.get('/pdf', async (req, res) => {
  const { url, format = 'A4' } = req.query;
  if (!url) return res.status(400).json({ error: 'url parameter required' });

  if (!checkRateLimit(req.ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded', wallet: WALLET });
  }

  try {
    const b = await getBrowser();
    const page = await b.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const pdf = await page.pdf({ format, printBackground: true });
    await page.close();

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline; filename="page.pdf"');
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HTML to Image endpoint
app.post('/html-to-image', async (req, res) => {
  if (!checkRateLimit(req.ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded', wallet: WALLET });
  }

  try {
    let html = '';
    if (req.headers['content-type']?.includes('text/html')) {
      html = req.body?.toString() || '';
    } else {
      html = req.body?.html || '';
    }
    if (!html) return res.status(400).json({ error: 'HTML content required' });

    const b = await getBrowser();
    const page = await b.newPage();
    await page.setContent(html, { waitUntil: 'networkidle2' });
    const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
    await page.close();

    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', wallet: WALLET, freeRequests: RATE_LIMIT_FREE });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌸 SnapAPI running on http://0.0.0.0:${PORT}`);
  console.log(`Wallet: ${WALLET}`);
});

// ============ QR Code Generator ============
app.get('/qr', async (req, res) => {
  const { text, size = 256 } = req.query;
  if (!text) return res.status(400).json({ error: 'text parameter required' });
  
  try {
    // Generate QR using Google Charts API (no dependency needed)
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(text)}&choe=UTF-8`;
    const resp = await fetch(qrUrl);
    const buffer = Buffer.from(await resp.arrayBuffer());
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Website Meta Extractor ============
app.get('/meta', async (req, res) => {
  const { url: targetUrl } = req.query;
  if (!targetUrl) return res.status(400).json({ error: 'url parameter required' });
  
  try {
    const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] });
    const page = await browser.newPage();
    await page.goto(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`, { 
      waitUntil: 'domcontentloaded', timeout: 15000 
    });
    
    const meta = await page.evaluate(() => {
      const get = (sel) => document.querySelector(sel)?.content || document.querySelector(sel)?.textContent || '';
      return {
        title: document.title,
        description: get('meta[name="description"]'),
        ogTitle: get('meta[property="og:title"]'),
        ogDescription: get('meta[property="og:description"]'),
        ogImage: get('meta[property="og:image"]'),
        ogType: get('meta[property="og:type"]'),
        twitterCard: get('meta[name="twitter:card"]'),
        twitterTitle: get('meta[name="twitter:title"]'),
        favicon: document.querySelector('link[rel*="icon"]')?.href || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        h1: document.querySelector('h1')?.textContent?.trim() || '',
      };
    });
    
    await browser.close();
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Website Performance Check ============
app.get('/perf', async (req, res) => {
  const { url: targetUrl } = req.query;
  if (!targetUrl) return res.status(400).json({ error: 'url parameter required' });
  
  try {
    const start = Date.now();
    const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] });
    const page = await browser.newPage();
    
    const response = await page.goto(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`, { 
      waitUntil: 'networkidle2', timeout: 30000 
    });
    
    const loadTime = Date.now() - start;
    const perf = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: Math.round(timing?.domContentLoadedEventEnd || 0),
        domComplete: Math.round(timing?.domComplete || 0),
        loadEvent: Math.round(timing?.loadEventEnd || 0),
        resourceCount: performance.getEntriesByType('resource').length,
        totalTransferSize: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0),
      };
    });
    
    await browser.close();
    res.json({
      url: targetUrl,
      statusCode: response.status(),
      totalLoadTimeMs: loadTime,
      ...perf,
      totalTransferSizeKB: Math.round(perf.totalTransferSize / 1024),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ OG Image Generator ============
app.get('/og', async (req, res) => {
  const { 
    title = 'Hello World', 
    desc = '', 
    theme = 'dark',
    emoji = '',
    author = '',
    domain = '',
    width = 1200,
    height = 630,
  } = req.query;
  
  try {
    const fs = require('fs');
    const path = require('path');
    let template = fs.readFileSync(path.join(__dirname, 'og-template.html'), 'utf8');
    
    const themeClass = `theme-${['dark','light','sunset','ocean','forest'].includes(theme) ? theme : 'dark'}`;
    const emojiHtml = emoji ? `<div class="og-emoji">${emoji}</div>` : '';
    
    template = template
      .replace('{{THEME_CLASS}}', themeClass)
      .replace('{{EMOJI_HTML}}', emojiHtml)
      .replace('{{TITLE}}', title.replace(/</g, '&lt;'))
      .replace('{{DESCRIPTION}}', (desc || '').replace(/</g, '&lt;'))
      .replace('{{AUTHOR}}', (author || '').replace(/</g, '&lt;'))
      .replace('{{DOMAIN}}', (domain || '').replace(/</g, '&lt;'));
    
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: parseInt(width), height: parseInt(height) });
    await page.setContent(template, { waitUntil: 'networkidle0' });
    const buffer = await page.screenshot({ type: 'png' });
    await browser.close();
    
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Crypto Utilities ============

// Wallet address QR code (convenience endpoint)
app.get('/wallet-qr', (req, res) => {
  const { address, chain = 'ETH', size = 256 } = req.query;
  if (!address) return res.status(400).json({ error: 'address required' });
  
  const text = address;
  fetch(`https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(text)}&choe=UTF-8`)
    .then(r => r.arrayBuffer())
    .then(buf => {
      res.set('Content-Type', 'image/png');
      res.send(Buffer.from(buf));
    })
    .catch(e => res.status(500).json({ error: e.message }));
});

// Address validation
app.get('/validate-address', (req, res) => {
  const { address, chain = 'ETH' } = req.query;
  if (!address) return res.status(400).json({ error: 'address required' });
  
  let valid = false, checksum = false, type = 'unknown';
  
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
    valid = true; type = 'EVM (ETH/BSC/Polygon)';
  } else if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address)) {
    valid = true; type = 'Bitcoin';
  } else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    valid = true; type = 'Solana';
  } else if (/^T[A-Za-z1-9]{33}$/.test(address)) {
    valid = true; type = 'Tron';
  }
  
  res.json({ address, valid, type, chain });
});

// Simple phishing check (domain reputation)
app.get('/check-url', async (req, res) => {
  const { url: targetUrl } = req.query;
  if (!targetUrl) return res.status(400).json({ error: 'url required' });
  
  try {
    const domain = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).hostname;
    
    // Check against known crypto phishing patterns
    const phishingPatterns = [
      /metamask[^.]*\.(net|org|io|xyz|cc)/i,
      /uniswap[^.]*\.(net|org|io|xyz|cc)/i,
      /binance[^.]*\.(net|io|xyz|cc)/i,
      /coinbase[^.]*\.(net|io|xyz|cc)/i,
      /connect-wallet/i,
      /claimnft/i,
      /airdrop-claim/i,
      /mint-free/i,
    ];
    
    const suspicious = phishingPatterns.some(p => p.test(domain));
    const hasHomoglyphs = /[^\x00-\x7F]/.test(domain);
    const risk = suspicious || hasHomoglyphs ? 'high' : 'low';
    
    res.json({
      url: targetUrl,
      domain,
      risk,
      suspicious,
      hasHomoglyphs,
      warning: risk === 'high' ? '⚠️ This URL shows signs of being a phishing site!' : null,
    });
  } catch(e) {
    res.status(400).json({ error: 'Invalid URL' });
  }
});
