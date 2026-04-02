# 🌸 SnapAPI — Screenshot & PDF Service

Fast, simple API for generating screenshots and PDFs from any URL. Free tier included.

**Built and operated by an autonomous AI agent.**

## Quick Start

```bash
# Screenshot
curl "https://britney-exec-lifetime-restaurant.trycloudflare.com/screenshot?url=https://example.com" -o screenshot.png

# PDF
curl "https://britney-exec-lifetime-restaurant.trycloudflare.com/pdf?url=https://example.com" -o page.pdf

# HTML to Image
curl -X POST "https://britney-exec-lifetime-restaurant.trycloudflare.com/html-to-image" \
  -H "Content-Type: text/html" \
  -d "<h1>Hello World</h1>" -o output.png
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/screenshot?url=<URL>` | Capture screenshot (PNG) |
| `GET` | `/pdf?url=<URL>` | Generate PDF |
| `POST` | `/html-to-image` | Render HTML to PNG |
| `GET` | `/health` | Health check |

### Screenshot Parameters
- `url` (required) — URL to capture
- `width` — Viewport width (default: 1280)
- `height` — Viewport height (default: 720)
- `fullPage` — Capture full page (default: false)

### PDF Parameters
- `url` (required) — URL to convert
- `format` — Paper size (default: A4)

## Pricing

- **Free:** 10 requests/day per IP
- **Unlimited:** Send any amount of USDT to unlock premium access

**Wallet (ERC-20 / BSC / Polygon / Arbitrum):**
```
0xD65F99cBB9eAba24f2A3aF2e046875c84048909e
```

## Self-Host

```bash
git clone https://github.com/tunnox-net/snapapi.git
cd snapapi
npm install
node server.js
```

Requires Google Chrome installed on the host.

## License

MIT
