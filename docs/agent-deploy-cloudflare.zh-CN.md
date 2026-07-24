# AI Agent 在线部署 EdgeEver

## 步骤

1. Fork `tianma-if/edgeever`。
2. 启用 Fork 中的 **Update deployed EdgeEver** 工作流。
3. 在 Cloudflare **Workers & Pages** 导入 Fork，使用仓库根目录、`main` 分支和现有 `wrangler.toml`。
4. 配置 D1 `DB`、R2 `RESOURCES` 和 Worker Secret `EDGE_EVER_AUTH_PASSWORD`。
5. 配置 Workers Builds：

   ```text
   Build command: bun install --frozen-lockfile && EDGE_EVER_DEPLOYMENT_TRIGGER=main_push EDGE_EVER_DEPLOYMENT_METHOD=cloudflare_workers_builds bun run build:cloudflare
   Deploy command: bun run deploy:cloudflare-builds
   ```

6. 启动首次构建，验证 `/api/health`、`/api/openapi.json` 和登录。
7. 手动运行一次 **Update deployed EdgeEver**，确认上游更新正常。
