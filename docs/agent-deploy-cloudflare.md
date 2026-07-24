# AI Agent Cloudflare Deployment

## Steps

1. Fork `tianma-if/edgeever`.
2. Enable the Fork's **Update deployed EdgeEver** workflow.
3. In Cloudflare **Workers & Pages**, import the Fork using the repository root, `main` branch, and existing `wrangler.toml`.
4. Configure D1 `DB`, R2 `RESOURCES`, and the Worker Secret `EDGE_EVER_AUTH_PASSWORD`.
5. Configure Workers Builds:

   ```text
   Build command: bun install --frozen-lockfile && EDGE_EVER_DEPLOYMENT_TRIGGER=main_push EDGE_EVER_DEPLOYMENT_METHOD=cloudflare_workers_builds bun run build:cloudflare
   Deploy command: bun run deploy:cloudflare-builds
   ```

6. Start the first build and verify `/api/health`, `/api/openapi.json`, and login.
7. Run **Update deployed EdgeEver** once and confirm that upstream updates work.
