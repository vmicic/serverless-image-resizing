# serverless-image-resizing

- Install wrangler `npm install -g @cloudflare/wrangler`
- Login with your credentials `wrangler login`
- Create two KV namespaces (one for dev environment, and one for production) `wrangler kv:namespace create NAMESPACE_NAME`
- In wrangler.toml change kv_namespaces preview_id with dev namespace id, and id with production namespace id
- Run locally `wrangler dev`
- Publish `wrangler publish`
