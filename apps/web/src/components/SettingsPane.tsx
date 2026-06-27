import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, Trash2, ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { AppConfirmDialog } from "./dialogs/ConfirmDialogs";
import type { ApiToken } from "@edgeever/shared";

const DEFAULT_TOKEN_SCOPES = ["read:notebooks", "read:memos", "read:tags"];

interface SettingsPaneProps {
  onClose: () => void;
}

export const SettingsPane = ({ onClose }: SettingsPaneProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("MCP Agent");
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(() => new Set(DEFAULT_TOKEN_SCOPES));
  const [createdToken, setCreatedToken] = useState<{ token: string; apiToken: ApiToken } | null>(null);
  const [tokenRevokeConfirmation, setTokenRevokeConfirmation] = useState<ApiToken | null>(null);

  const tokensQuery = useQuery({
    queryKey: ["api-tokens"],
    queryFn: () => api.listApiTokens(),
  });

  const availableScopes = tokensQuery.data?.availableScopes ?? [
    "read:notebooks",
    "write:notebooks",
    "read:memos",
    "write:memos",
    "read:resources",
    "write:resources",
    "read:tags",
    "write:tags",
  ];

  const createMutation = useMutation({
    mutationFn: api.createApiToken,
    onSuccess: async (data) => {
      setCreatedToken(data);
      setName("");
      setSelectedScopes(new Set(DEFAULT_TOKEN_SCOPES));
      await queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: api.revokeApiToken,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });

  const tokens = tokensQuery.data?.apiTokens ?? [];

  const toggleScope = (scope: string) => {
    setSelectedScopes((current) => {
      const next = new Set(current);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const scopes = Array.from(selectedScopes);

    if (!name.trim() || scopes.length === 0) {
      return;
    }

    createMutation.mutate({ name: name.trim(), scopes });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-end justify-between border-b border-slate-200 px-6 pb-3 pt-[env(safe-area-inset-top)] lg:h-16 lg:items-center lg:pb-0 lg:pt-0">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            title="返回编辑器"
            aria-label="返回编辑器"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <ChevronLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-base font-bold text-slate-900 leading-tight">
              <KeyRound className="h-4.5 w-4.5 text-emerald-700" />
              API & MCP 设置
            </h1>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              管理用于本地 MCP 客户端或第三方 API 访问的身份凭证
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        <div className="mx-auto max-w-3xl space-y-6">
          {createdToken && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm animate-fade-in">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-900">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                API Token 已成功生成
              </div>
              <div className="flex gap-2">
                <input
                  className="h-10 min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3.5 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  readOnly
                  value={createdToken.token}
                />
                <Button
                  size="md"
                  variant="solid"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(createdToken.token)}
                >
                  复制 Token
                </Button>
              </div>
              <p className="mt-2 text-xs font-medium text-emerald-800">
                ⚠️ 安全警告：为了您的账户安全，明文 Token 仅在此处展示一次，关闭后将无法再次找回！
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-700" />
              新建 API Token
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 text-sm outline-none transition duration-150 focus:border-[#627f58] focus:bg-white focus:ring-4 focus:ring-[#627f58]/10"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Token 用途描述，例如: Cline Agent"
                />
                <Button 
                  size="md" 
                  variant="solid" 
                  className="h-10 bg-[#627f58] hover:bg-[#526d49] text-white"
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  <KeyRound className="h-4 w-4 mr-1.5" />
                  生成 Token
                </Button>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-500">选择 Scope 权限范围：</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {availableScopes.map((scope) => (
                    <label
                      key={scope}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-lg border px-3 py-1 cursor-pointer transition-all duration-150",
                        selectedScopes.has(scope)
                          ? "border-[#627f58]/30 bg-[#f3f7f1]/50 text-[#526d49]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.has(scope)}
                        onChange={() => toggleScope(scope)}
                        className="h-4 w-4 shrink-0 rounded border-emerald-300 text-[#627f58] focus:ring-[#627f58]"
                      />
                      <span className="min-w-0 truncate font-mono text-[11px] font-semibold">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4">活跃的 Token 列表</h2>
            <div className="space-y-3">
              {tokensQuery.isLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">正在加载 Token 列表...</div>
              ) : tokens.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-400">
                  暂无活跃的 API Token
                </div>
              ) : (
                tokens.map((token) => (
                  <div
                    key={token.id}
                    className={cn(
                      "flex min-h-16 items-center gap-4 rounded-xl border p-4 transition-all duration-200",
                      token.isRevoked ? "border-slate-100 bg-slate-50/50 opacity-60" : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-800 leading-tight">{token.name}</span>
                      <span className="mt-2 block truncate font-mono text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100">
                        {token.scopes.join(", ") || "no scopes"}
                      </span>
                      <span className="mt-2 block text-[10px] font-medium text-slate-400">
                        {token.lastUsedAt ? `上次调用时间：${formatDateTime(token.lastUsedAt)}` : "从未被调用"}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      className="shrink-0"
                      disabled={token.isRevoked || revokeMutation.isPending}
                      onClick={() => setTokenRevokeConfirmation(token)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      撤销
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {tokenRevokeConfirmation && (
        <AppConfirmDialog
          title={`确定要撤销 Token「${tokenRevokeConfirmation.name}」吗？`}
          description="撤销操作不可逆。一旦撤销，使用此 Token 进行 API 或 MCP 调用的一切客户端将立即失效并被拒绝访问。"
          confirmLabel="确认撤销"
          isWorking={revokeMutation.isPending}
          tone="danger"
          onCancel={() => setTokenRevokeConfirmation(null)}
          onConfirm={() => {
            revokeMutation.mutate(tokenRevokeConfirmation.id, {
              onSuccess: () => setTokenRevokeConfirmation(null),
            });
          }}
        />
      )}
    </div>
  );
};
