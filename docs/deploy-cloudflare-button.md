# Deploy EdgeEver online from a Fork

## First installation

1. Fork EdgeEver on GitHub.
2. In Cloudflare **Workers & Pages**, import the Fork.
3. Use the repository root and `main` branch. Keep the repository's `wrangler.toml`.
4. Configure:
   - D1 binding: `DB`, database name: `edgeever`
   - R2 binding: `RESOURCES`, with a unique bucket name
   - Worker Secret: `EDGE_EVER_AUTH_PASSWORD`
5. Set the build commands:

   ```text
   Build command: bun install --frozen-lockfile && EDGE_EVER_DEPLOYMENT_TRIGGER=main_push EDGE_EVER_DEPLOYMENT_METHOD=cloudflare_workers_builds bun run build:cloudflare
   Deploy command: bun run deploy:cloudflare-builds
   ```

6. Start the build. Confirm that `/api/health` returns `200` with `"ok": true`, then test login.
7. In the Fork's **Actions**, enable and run **Update deployed EdgeEver** once.

## Update channel

The default follows formal Releases. To follow upstream `main`, create:

```text
EDGE_EVER_UPDATE_CHANNEL=edge
```

## Troubleshooting

- Build failure: inspect the Worker **Deployments** log.
- No updates: open the Fork's **Actions**, enable **Update deployed EdgeEver**, and run it manually.
- Recovery: [Cloudflare Manual Deployment](manual-deploy.md).
