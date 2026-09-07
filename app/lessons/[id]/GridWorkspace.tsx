"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button } from "@/components/ui";
import type { GridTemplateShape } from "@/lib/gridTemplate";
import {
  generateGridAction,
  revertCellAction,
  saveCellAction,
} from "./actions";

interface CellData {
  rowKey: string;
  columnKey: string;
  content: string;
  teacherEdited: boolean;
}

interface GridData {
  id: string;
  levelId: string;
  status: string;
  error: string | null;
  model: string | null;
  generatedAt: string | null;
  cells: CellData[];
}

interface Level {
  id: string;
  name: string;
  description: string | null;
}

export function GridWorkspace({
  lessonId,
  templateName,
  shape,
  levels,
  grids,
  quota,
}: {
  lessonId: string;
  templateName: string;
  shape: GridTemplateShape;
  levels: Level[];
  grids: GridData[];
  quota: { used: number; cap: number | null };
}) {
  const router = useRouter();
  const [activeLevelId, setActiveLevelId] = useState(levels[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const activeLevel =
    levels.find((level) => level.id === activeLevelId) ?? levels[0];
  const grid = grids.find((g) => g.levelId === activeLevel?.id);
  const quotaExceeded = quota.cap !== null && quota.used >= quota.cap;

  const cellMap = new Map(
    grid?.cells.map((cell) => [`${cell.rowKey}/${cell.columnKey}`, cell]),
  );

  async function onGenerate(levelId: string) {
    setError(null);
    setGenerating(levelId);
    const result = await generateGridAction({ lessonId, levelId });
    setGenerating(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function onGenerateAll() {
    setError(null);
    for (const level of levels) {
      setGenerating(level.id);
      const result = await generateGridAction({ lessonId, levelId: level.id });
      if (!result.ok) {
        setGenerating(null);
        setError(result.error);
        return;
      }
    }
    setGenerating(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div
        data-testid="level-tabs"
        className="no-print flex flex-wrap items-center gap-2 border-b border-border"
      >
        {levels.map((level) => {
          const levelGrid = grids.find((g) => g.levelId === level.id);
          const isActive = level.id === activeLevel?.id;
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => setActiveLevelId(level.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {level.name}
              <span className="ml-2 text-xs font-normal text-muted">
                {levelGrid?.status === "READY"
                  ? "✓"
                  : levelGrid?.status === "FAILED"
                    ? "!"
                    : "–"}
              </span>
            </button>
          );
        })}
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {quotaExceeded ? (
        <Alert>
          You have used your monthly generation limit (
          {quota.used.toLocaleString()} of {quota.cap?.toLocaleString()}{" "}
          tokens). Existing grids still print; ask an admin to raise the limit
          to generate more.
        </Alert>
      ) : null}

      <div className="no-print flex flex-wrap items-center gap-3">
        <Button
          onClick={() => activeLevel && onGenerate(activeLevel.id)}
          disabled={generating !== null || quotaExceeded || !activeLevel}
        >
          {generating === activeLevel?.id
            ? "Generating…"
            : grid?.status === "READY"
              ? `Regenerate ${activeLevel?.name}`
              : `Generate ${activeLevel?.name}`}
        </Button>
        <Button
          variant="secondary"
          onClick={onGenerateAll}
          disabled={generating !== null || quotaExceeded}
        >
          Generate all {levels.length} levels
        </Button>
        <span className="text-xs text-muted">
          Layout: {templateName} ·{" "}
          <Link href="/settings/templates" className="underline">
            change rows and columns
          </Link>
        </span>
      </div>

      {activeLevel?.description ? (
        <p className="text-xs text-muted">{activeLevel.description}</p>
      ) : null}

      {grid?.status === "FAILED" ? (
        <Alert>{grid.error ?? "Generation failed."}</Alert>
      ) : null}

      {!grid || grid.cells.length === 0 ? (
        <p className="rounded border border-dashed border-border bg-surface px-3 py-2 text-sm text-muted">
          No grid for {activeLevel?.name} yet — this is the empty layout.
          Generate above to fill it.
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-28 border border-border bg-surface-muted p-2 text-left align-bottom">
                Phase
              </th>
              {shape.columns.map((column) => (
                <th
                  key={column.key}
                  className="border border-border bg-surface-muted p-2 text-left align-bottom"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shape.rows.map((row) => (
              <tr key={row.key}>
                <th className="border border-border bg-surface-muted p-2 text-left align-top font-medium">
                  {row.label}
                </th>
                {shape.columns.map((column) => (
                  <td
                    key={column.key}
                    className="border border-border p-0 align-top"
                  >
                    <EditableCell
                      gridId={grid?.id ?? null}
                      rowKey={row.key}
                      columnKey={column.key}
                      cell={cellMap.get(`${row.key}/${column.key}`)}
                      onSaved={() => startTransition(() => router.refresh())}
                      onError={setError}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {grid?.generatedAt ? (
        <p className="no-print text-xs text-muted">
          Generated {new Date(grid.generatedAt).toLocaleString()}
          {grid.model ? ` · ${grid.model}` : ""} · cells you edit are marked and
          are kept when you regenerate.
        </p>
      ) : null}
    </div>
  );
}

function EditableCell({
  gridId,
  rowKey,
  columnKey,
  cell,
  onSaved,
  onError,
}: {
  /** null before the grid has ever been generated: the cell is read-only then. */
  gridId: string | null;
  rowKey: string;
  columnKey: string;
  cell?: CellData;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(cell?.content ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!gridId) return;
    setSaving(true);
    const result = await saveCellAction({
      gridId,
      rowKey,
      columnKey,
      content: value,
    });
    setSaving(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    setEditing(false);
    onSaved();
  }

  async function revert() {
    if (!gridId) return;
    const result = await revertCellAction({ gridId, rowKey, columnKey });
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSaved();
  }

  if (editing) {
    return (
      <div className="p-1.5">
        <textarea
          value={value}
          rows={8}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded border border-accent p-1.5 text-xs focus:outline-none"
          autoFocus
        />
        <div className="mt-1 flex gap-1.5">
          <Button
            onClick={save}
            disabled={saving}
            className="!px-2 !py-0.5 !text-xs"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setValue(cell?.content ?? "");
              setEditing(false);
            }}
            className="!px-2 !py-0.5 !text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative p-2">
      {cell?.teacherEdited ? (
        <span className="no-print absolute right-1 top-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          edited
        </span>
      ) : null}
      <div className="whitespace-pre-wrap text-xs leading-relaxed">
        {cell?.content || <span className="text-muted">—</span>}
      </div>
      <div className="no-print mt-1 flex gap-2 opacity-0 transition group-hover:opacity-100">
        {gridId ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] text-accent underline"
          >
            Edit
          </button>
        ) : null}
        {cell?.teacherEdited ? (
          <button
            type="button"
            onClick={revert}
            className="text-[11px] text-muted underline"
          >
            Let Claude rewrite
          </button>
        ) : null}
      </div>
    </div>
  );
}
