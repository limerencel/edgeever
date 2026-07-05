import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock3, History, RotateCcw, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { getMemoTitle } from "@/lib/app-helpers";
import { AppConfirmDialog } from "./ConfirmDialogs";
import type { MemoDetail } from "@edgeever/shared";

const summarizeMarkdownDiff = (left: string, right: string) => {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");
  const maxLines = Math.max(leftLines.length, rightLines.length);
  let changed = 0;

  for (let index = 0; index < maxLines; index += 1) {
    if ((leftLines[index] ?? "") !== (rightLines[index] ?? "")) {
      changed += 1;
    }
  }

  return { changed };
};

type DiffRow = {
  lineNumber: number;
  text: string;
  state: "same" | "changed" | "empty";
};

const buildRevisionDiffRows = (left: string, right: string) => {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");
  const maxLines = Math.max(leftLines.length, rightLines.length, 1);
  const leftRows: DiffRow[] = [];
  const rightRows: DiffRow[] = [];

  for (let index = 0; index < maxLines; index += 1) {
    const leftText = leftLines[index] ?? "";
    const rightText = rightLines[index] ?? "";
    const isChanged = leftText !== rightText;

    leftRows.push({
      lineNumber: index + 1,
      text: leftText,
      state: isChanged ? "changed" : leftText ? "same" : "empty",
    });
    rightRows.push({
      lineNumber: index + 1,
      text: rightText,
      state: isChanged ? "changed" : rightText ? "same" : "empty",
    });
  }

  return { leftRows, rightRows };
};

const formatRevisionActor = (actor: string) => {
  if (actor.startsWith("user:")) {
    return "user";
  }

  if (actor.startsWith("agent:")) {
    return "agent";
  }

  return actor || "system";
};

const RevisionPreview = ({ title, rows, tone }: { title: string; rows: DiffRow[]; tone: "history" | "current" }) => {
  const { t } = useTranslation();
  const hasContent = rows.some((row) => row.text);

  return (
    <div className="min-h-0 border-b border-slate-200 bg-white last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4">
        <div className="text-xs font-semibold text-slate-600">{title}</div>
        <div className={cn("h-2 w-2 rounded-full", tone === "history" ? "bg-amber-400" : "bg-emerald-500")} />
      </div>
      <div className="max-h-[34dvh] min-h-[220px] overflow-auto font-mono text-[13px] leading-6 lg:max-h-[58dvh]">
        {hasContent ? (
          rows.map((row) => (
            <div
              key={row.lineNumber}
              className={cn(
                "grid grid-cols-[3rem_minmax(0,1fr)] border-b border-transparent px-0",
                row.state === "changed" && tone === "history" && "bg-amber-50/70 text-amber-950",
                row.state === "changed" && tone === "current" && "bg-emerald-50/75 text-emerald-950",
                row.state !== "changed" && "text-slate-700"
              )}
            >
              <span className="select-none border-r border-slate-100 px-3 text-right text-[11px] text-slate-400">
                {row.lineNumber}
              </span>
              <span className={cn("whitespace-pre-wrap break-words px-3", !row.text && "text-slate-400")}>
                {row.text || " "}
              </span>
            </div>
          ))
        ) : (
          <div className="px-4 py-5 text-sm text-slate-500">{t("revisions.emptyMemo")}</div>
        )}
      </div>
    </div>
  );
};

export const RevisionHistoryDialog = ({
  memo,
  currentMarkdown,
  onClose,
  onRestored,
}: {
  memo: MemoDetail;
  currentMarkdown: string;
  onClose: () => void;
  onRestored: (memo: MemoDetail) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [restoreRevisionConfirmationId, setRestoreRevisionConfirmationId] = useState<string | null>(null);

  const revisionsQuery = useQuery({
    queryKey: ["memo-revisions", memo.id],
    queryFn: () => api.listMemoRevisions(memo.id),
  });

  const revisions = revisionsQuery.data?.revisions ?? [];
  const selectedRevision =
    revisions.find((revision) => revision.id === selectedRevisionId) ?? revisions[0] ?? null;

  const diffSummary = useMemo(
    () => summarizeMarkdownDiff(selectedRevision?.contentMarkdown ?? "", currentMarkdown),
    [currentMarkdown, selectedRevision?.contentMarkdown]
  );
  const diffRows = useMemo(
    () => buildRevisionDiffRows(selectedRevision?.contentMarkdown ?? "", currentMarkdown),
    [currentMarkdown, selectedRevision?.contentMarkdown]
  );

  const restoreMutation = useMutation({
    mutationFn: (revisionId: string) => api.restoreMemoRevision(memo.id, revisionId),
    onSuccess: async (data) => {
      setRestoreRevisionConfirmationId(null);
      await onRestored(data.memo);
    },
  });

  useEffect(() => {
    if (!selectedRevisionId && revisions.length > 0) {
      setSelectedRevisionId(revisions[0].id);
    }
  }, [revisions, selectedRevisionId]);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !restoreRevisionConfirmationId) onClose(); }}>
      <DialogContent className="grid max-h-[88dvh] max-w-[1120px] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-0 shadow-xl">
        <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 text-left">
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-950">
              <History className="h-5 w-5 text-emerald-600" />
              {t("revisions.title")}
            </DialogTitle>
            <DialogDescription className="mt-1 truncate text-sm text-slate-500">
              {getMemoTitle(memo.title)}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-col bg-white">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {selectedRevision ? t("revisions.compareTitle", { revision: selectedRevision.revision }) : t("revisions.noRevisionSelected")}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {selectedRevision ? t("revisions.changedLines", { count: diffSummary.changed }) : t("revisions.noRevisionSelected")}
              </div>
            </div>
            <Button
              size="sm"
              variant="solid"
              disabled={!selectedRevision || memo.isDeleted || restoreMutation.isPending}
              onClick={() => {
                if (selectedRevision) {
                  setRestoreRevisionConfirmationId(selectedRevision.id);
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {t("revisions.restoreVersion")}
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-1">
            <aside className="min-h-0 max-h-[230px] overflow-y-auto border-b border-slate-200 bg-slate-50/70 p-3 lg:max-h-[calc(88dvh-73px)] lg:border-b-0 lg:border-r">
              <div className="mb-2 px-2 text-xs font-semibold uppercase text-slate-500">{t("revisions.timeline")}</div>
              {revisionsQuery.isLoading ? (
                <div className="px-2 py-8 text-center text-sm text-slate-500">{t("revisions.loading")}</div>
              ) : revisions.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  {t("revisions.empty")}
                </div>
              ) : (
                <div className="space-y-1">
                  {revisions.map((revision) => (
                    <button
                      key={revision.id}
                      className={cn(
                        "group relative block w-full rounded-md border px-3 py-3 text-left transition",
                        selectedRevision?.id === revision.id
                          ? "border-emerald-200 bg-white shadow-sm ring-1 ring-emerald-100"
                          : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
                      )}
                      onClick={() => setSelectedRevisionId(revision.id)}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-3 h-[calc(100%-1.5rem)] w-0.5 rounded-full",
                          selectedRevision?.id === revision.id ? "bg-emerald-500" : "bg-transparent group-hover:bg-slate-300"
                        )}
                      />
                      <span className="block text-sm font-semibold text-slate-950">
                        {t("revisions.revisionName", { revision: revision.revision })}
                      </span>
                      <span className="mt-2 flex items-center gap-2 truncate text-xs text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        <span className="truncate">{formatDateTime(revision.createdAt)}</span>
                      </span>
                      <span className="mt-1.5 flex items-center gap-2 truncate text-xs text-slate-400">
                        <UserRound className="h-3.5 w-3.5" />
                        <span className="truncate">{formatRevisionActor(revision.createdBy)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <div className="flex min-h-0 flex-col">
              <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
                <RevisionPreview title={t("revisions.historyVersion")} rows={diffRows.leftRows} tone="history" />
                <RevisionPreview title={t("revisions.currentContent")} rows={diffRows.rightRows} tone="current" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {restoreRevisionConfirmationId && (
        <AppConfirmDialog
          title={t("revisions.restoreConfirmTitle")}
          description={t("revisions.restoreConfirmDescription")}
          confirmLabel={t("revisions.restoreConfirmLabel")}
          isWorking={restoreMutation.isPending}
          tone="primary"
          onCancel={() => setRestoreRevisionConfirmationId(null)}
          onConfirm={() => restoreMutation.mutate(restoreRevisionConfirmationId)}
        />
      )}
    </Dialog>
  );
};
