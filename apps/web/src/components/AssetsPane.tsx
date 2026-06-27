import { useQuery } from "@tanstack/react-query";
import { Archive, HardDrive, ImageIcon, File as FileIcon, ExternalLink, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${exponent === 0 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2)} ${units[exponent]}`;
};

interface AssetsPaneProps {
  onClose: () => void;
}

export const AssetsPane = ({ onClose }: AssetsPaneProps) => {
  const resourcesQuery = useQuery({
    queryKey: ["resources"],
    queryFn: () => api.listResources(),
  });
  const resources = resourcesQuery.data?.resources ?? [];
  const summary = resourcesQuery.data?.summary ?? {
    totalCount: 0,
    totalBytes: 0,
    imageCount: 0,
    attachmentCount: 0,
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
              <Archive className="h-4.5 w-4.5 text-emerald-700" />
              附件管理
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              <span className="inline-flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {formatBytes(summary.totalBytes)}
              </span>
              <span>•</span>
              <span>{summary.totalCount} 文件</span>
              <span>•</span>
              <span>{summary.imageCount} 图片</span>
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        <div className="mx-auto max-w-4xl">
          {resourcesQuery.isLoading ? (
            <div className="flex items-center justify-center py-24 text-sm text-slate-400">正在加载附件列表...</div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-24 text-center">
              <Archive className="h-10 w-10 text-slate-350 mb-3 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-500">暂无附件</p>
              <p className="mt-1 text-xs text-slate-400">插入到笔记中的图片或文件会显示在这里</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {resources.map((resource) => (
                <a
                  key={resource.id}
                  className="group relative flex min-h-16 items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-3.5 text-left transition-all duration-200 hover:border-[#627f58]/35 hover:shadow-[0_8px_20px_-4px_rgba(98,127,88,0.06)]"
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50/50 text-[#627f58] transition-colors group-hover:bg-[#f3f7f1]/60 group-hover:border-[#627f58]/20">
                    {resource.kind === "image" ? <ImageIcon className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800 leading-snug group-hover:text-[#526d49] transition-colors">
                      {resource.filename || resource.id}
                    </span>
                    <span className="mt-1.5 block truncate text-[11px] font-medium text-slate-400">
                      {formatBytes(resource.byteSize)} · {resource.mimeType?.split("/")[1] || resource.kind} ·{" "}
                      {formatDateTime(resource.createdAt)}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-slate-500">
                      来源笔记：{resource.memoDeleted
                        ? "已删除笔记"
                        : resource.memoTitle || resource.memoExcerpt || resource.memoId}
                    </span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-350 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
