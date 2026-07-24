# 从 Fork 在线部署 EdgeEver

## 首次部署

1. [Fork EdgeEver](https://github.com/tianma-if/edgeever/fork)。
2. 在 Cloudflare **Workers & Pages** 导入这个 Fork。
3. 使用仓库根目录和 `main` 分支，读取仓库中的 `wrangler.toml`。
4. 配置：
   - D1 binding：`DB`，数据库名：`edgeever`
   - R2 binding：`RESOURCES`，bucket 名称自定义且唯一
   - Worker Secret：`EDGE_EVER_AUTH_PASSWORD`
5. 设置构建命令：

   ```text
   Build command: bun install --frozen-lockfile && EDGE_EVER_DEPLOYMENT_TRIGGER=main_push EDGE_EVER_DEPLOYMENT_METHOD=cloudflare_workers_builds bun run build:cloudflare
   Deploy command: bun run deploy:cloudflare-builds
   ```

6. 启动构建。部署完成后确认 `/api/health` 返回 `200` 和 `"ok": true`，再测试登录。
7. 在 Fork 的 **Actions** 中启用并运行一次 **Update deployed EdgeEver**。

## 更新通道

默认跟随正式 Release。跟随上游 `main` 时创建：

```text
EDGE_EVER_UPDATE_CHANNEL=edge
```

## 排错

- 构建失败：查看 Cloudflare Worker 的 **Deployments** 日志。
- 更新没有运行：打开 Fork 的 **Actions**，启用 **Update deployed EdgeEver** 并手动运行。
- 恢复部署：[手动部署指南](manual-deploy.zh-CN.md)。
