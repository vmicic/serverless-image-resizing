# serverless-image-resizing

# Description

Cloudflare worker which can manipulate image with query parameters. It can resize, manipulate overlay (place it at specific position, repeat, size...), adjust quality and scale image.

## How to run

In project root:

- `npm install`
- `npm install -g @cloudflare/wrangler`
- Login with your credentials on Cloudflare `wrangler login`
- Create two KV namespaces (one for dev environment, and one for production) `wrangler kv:namespace create NAMESPACE_NAME`
- In wrangler.toml change kv_namespaces preview_id with dev namespace id, and id with production namespace id
- Run locally `wrangler dev`
- Publish `wrangler publish`
