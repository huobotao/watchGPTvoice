# Deploy notes

> **MVP runs entirely client-side.** You can serve the production build
> from any static host (your VPS, an Nginx container, even a USB stick).
> Multi-device sync is a V1 feature and requires the optional PocketBase
> backend described below.

## Static-only (MVP)

```bash
cd frontend
npm install
npm run build
# Output → dist/. Serve dist/ with any static file server.
```

On your VPS, the simplest setup is Caddy:

```caddyfile
geometry.example.com {
    root * /var/www/intimacy-geometry
    file_server
    encode zstd gzip
    try_files {path} /index.html
}
```

Caddy provisions HTTPS automatically.

## With sync (V1, planned)

PocketBase will be added as a sibling `backend/` directory. Expected
deployment shape:

```yaml
# backend/docker-compose.yml (planned)
services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    restart: unless-stopped
    ports: ["8090:8090"]
    volumes:
      - ./pb_data:/pb_data
      - ./pb_hooks:/pb_hooks
```

Front Caddy with `reverse_proxy /api/* pocketbase:8090` and the SPA continues
to be served as a static site.

## Recommended hosts

- **VPS:** Hetzner CX22 (~€4/mo) or DigitalOcean Basic Droplet ($5/mo).
- **Domain:** Cloudflare Registrar / Namecheap (DNS at Cloudflare is fine —
  the ToS restriction is on Pages/Workers, not DNS).
- **Avoid:** Cloudflare Pages, Vercel, Netlify — their ToS prohibit
  adult-themed content even when framed as biomechanics.

## PWA notes

- Install on iOS: open the site in Safari → Share → Add to Home Screen.
- The Service Worker caches the bundle for offline use; new deployments
  auto-update on next launch.
- Native shell (Capacitor for iOS / iPadOS / macOS Catalyst) is planned for
  V2 once content settles.
