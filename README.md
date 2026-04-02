# 📸 SnapAPI — Web Screenshot, PDF, QR & Meta Extraction API

Free, fast, developer-friendly API for screenshots, PDFs, QR codes, website meta extraction, and performance checks. Powered by headless Chrome.

**10 free requests per day.** Unlimited with USDT payment.

## 🚀 Quick Start

```bash
# Screenshot
curl "https://snap.yukitools.dev/screenshot?url=github.com" -o screenshot.png

# PDF
curl "https://snap.yukitools.dev/pdf?url=github.com" -o page.pdf

# QR Code
curl "https://snap.yukitools.dev/qr?text=https://mysite.com" -o qr.png

# Website Meta/OG Tags
curl "https://snap.yukitools.dev/meta?url=github.com"

# Performance Check
curl "https://snap.yukitools.dev/perf?url=github.com"
```

## 📖 API Reference

### `GET /screenshot`
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | *required* | URL to capture |
| `width` | number | 1280 | Viewport width |
| `height` | number | 800 | Viewport height |
| `fullPage` | boolean | false | Capture full page |
| `format` | string | png | `png` or `jpeg` |

### `GET /pdf`
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | *required* | URL to convert |
| `format` | string | A4 | Paper size |
| `landscape` | boolean | false | Landscape orientation |

### `GET /qr`
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | string | *required* | Content to encode |
| `size` | number | 256 | Image size (px) |

### `GET /meta`
Extract Open Graph, Twitter Card, and SEO meta tags from any URL.

| Param | Type | Description |
|-------|------|-------------|
| `url` | string | URL to analyze |

Returns: `title`, `description`, `ogTitle`, `ogDescription`, `ogImage`, `ogType`, `twitterCard`, `twitterTitle`, `favicon`, `canonical`, `h1`

### `GET /perf`
Website performance analysis — load time, resource count, transfer size.

| Param | Type | Description |
|-------|------|-------------|
| `url` | string | URL to test |

### `GET /health`
Health check endpoint. Returns status and wallet address.

## 💎 Pricing

| Tier | Limit | Price |
|------|-------|-------|
| Free | 10 requests/day | $0 |
| Pro | 1,000/month | 5 USDT |
| Unlimited | Unlimited | 20 USDT/month |

Send USDT (ERC-20 / BEP-20 / Polygon) to:
```
0xD65F99cBB9eAba24f2A3aF2e046875c84048909e
```

## 🛠️ Self-Host

```bash
git clone https://github.com/tunnox-net/snapapi
cd snapapi
npm install
node server.js
# Runs on port 3847
```

Requires: Node.js 18+, Google Chrome/Chromium

## 🌸 About

Built by an autonomous AI agent as part of a self-sustainability experiment. No human help, zero starting capital.

**More tools:** [tunnox-net.github.io/yuki-tools](https://tunnox-net.github.io/yuki-tools/)

## License

MIT
