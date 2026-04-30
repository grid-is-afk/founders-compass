import { useState, useRef } from "react";
import { CheckSquare, Square, ChevronDown, ChevronRight, Plus, X, Paperclip, FileText, Link2Off, SkipForward, MinusCircle, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubtaskItem {
  id?: string;
  title: string;
  done: boolean;
  sort_order: number;
}

export interface DocumentOption {
  id: string;
  name: string;
  category: string | null;
}

const SKIP_REASONS = ["Not required", "Other (please specify)"] as const;

interface ChecklistItemProps {
  label: string;
  category?: string;
  isDone: boolean;
  isSkipped?: boolean;
  skipReason?: string | null;
  subtasks: SubtaskItem[];
  isPending?: boolean;
  onToggle: () => void;
  onSkip: (reason: string) => void;
  onUnskip: () => void;
  onSubtasksChange: (subtasks: SubtaskItem[]) => void;
  // Optional document linking (Prove phase only)
  documents?: DocumentOption[];
  linkedDocumentId?: string | null;
  linkedDocumentName?: string | null;
  onLinkDocument?: (documentId: string) => void;
  onUnlinkDocument?: () => void;
  onDelete?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChecklistItem({
  label,
  category,
  isDone,
  isSkipped = false,
  skipReason,
  subtasks,
  isPending,
  onToggle,
  onSkip,
  onUnskip,
  onSubtasksChange,
  documents,
  linkedDocumentId,
  linkedDocumentName,
  onLinkDocument,
  onUnlinkDocument,
  onDelete,
}: ChecklistItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showSkipForm, setShowSkipForm] = useState(false);
  const [skipSelection, setSkipSelection] = useState<string>("");
  const [otherText, setOtherText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const doneCount = subtasks.filter((s) => s.done).length;
  const hasSubtasks = subtasks.length > 0;
  const hasDocumentFeature = !!documents;

  const isSkipValid =
    skipSelection === "Not required" ||
    (skipSelection === "Other (please specify)" && otherText.trim().length > 0);

  const handleSkipConfirm = () => {
    if (!isSkipValid) return;
    const reason =
      skipSelection === "Other (please specify)" ? otherText.trim() : skipSelection;
    onSkip(reason);
    setShowSkipForm(false);
    setSkipSelection("");
    setOtherText("");
  };

  const handleSkipCancel = () => {
    setShowSkipForm(false);
    setSkipSelection("");
    setOtherText("");
  };

  const handleToggleSubtask = (idx: number) => {
    const next = subtasks.map((s, i) => (i === idx ? { ...s, done: !s.done } : s));
    onSubtasksChange(next);
  };

  const handleDeleteSubtask = (idx: number) => {
    const next = subtasks
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, sort_order: i }));
    onSubtasksChange(next);
  };

  const handleAddSubtask = () => {
    const title = newTitle.trim();
    if (!title) return;
    onSubtasksChange([...subtasks, { title, done: false, sort_order: subtasks.length }]);
    setNewTitle("");
    inputRef.current?.focus();
  };

  return (
    <div>
      {/* Main row */}
      <div className={cn("flex items-center group", isSkipped && "opacity-70")}>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          disabled={isSkipped}
          className={cn(
            "pl-3 pr-1 py-3 flex-shrink-0 transition-colors",
            expanded ? "text-foreground/60" : "text-muted-foreground/30 hover:text-muted-foreground/60",
            isSkipped && "pointer-events-none"
          )}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/*
          Content area: checkbox icon + label + inline Skip/Undo.
          Using a div[role="button"] instead of <button> so we can legally
          nest real <button> elements (Skip, Undo) inside without invalid HTML.
          e.stopPropagation() on inner buttons prevents the toggle from firing.
        */}
        <div
          role="button"
          tabIndex={isSkipped || isPending ? -1 : 0}
          onClick={() => { if (!isSkipped && !isPending) onToggle(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !isSkipped && !isPending) onToggle(); }}
          className={cn(
            "flex items-center gap-3 flex-1 py-3 pr-2 text-left transition-colors min-w-0",
            !isSkipped && !isPending && "cursor-pointer hover:bg-muted/20",
            (isPending || isSkipped) && "cursor-default"
          )}
        >
          {/* Checkbox icon */}
          {isSkipped ? (
            <MinusCircle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
          ) : isDone ? (
            <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
          )}

          {/* Label + category/reason */}
          <div className="min-w-0 flex-1">
            <p className={cn(
              "text-sm truncate",
              isDone || isSkipped ? "line-through text-muted-foreground" : "text-foreground"
            )}>
              {label}
            </p>
            {isSkipped && skipReason ? (
              <p className="text-[10px] text-muted-foreground/50">Skipped · {skipReason}</p>
            ) : category ? (
              <p className="text-[10px] text-muted-foreground/60">{category}</p>
            ) : null}
          </div>

          {/* Subtask count */}
          {hasSubtasks && !isSkipped && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums flex-shrink-0">
              {doneCount}/{subtasks.length}
            </span>
          )}

          {/* Skip — inline, right after label, revealed on hover */}
          {!isDone && !isSkipped && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowSkipForm((v) => !v); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground/50 hover:text-amber-600 hover:bg-amber-50/60 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            >
              <SkipForward className="w-3 h-3" />
              Skip
            </button>
          )}

          {/* Undo — inline, always visible when skipped */}
          {isSkipped && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUnskip(); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </button>
          )}
        </div>

        {/* Right-side controls: Remove + Link file */}
        <div className="flex items-center pr-3 gap-2 flex-shrink-0">

          {/* Remove — for manually added items, revealed on hover */}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          )}

          {/* Link file */}
          {hasDocumentFeature && !isSkipped && (
            <>
              {linkedDocumentId && linkedDocumentName ? (
                <div className="flex items-center gap-1">
                  <a
                    href={`/api/documents/${linkedDocumentId}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-primary/70 hover:text-primary truncate max-w-[90px]"
                    title={linkedDocumentName}
                  >
                    <FileText className="w-3 h-3 inline mr-0.5" />
                    {linkedDocumentName.length > 14
                      ? linkedDocumentName.slice(0, 14) + "…"
                      : linkedDocumentName}
                  </a>
                  <button
                    type="button"
                    onClick={onUnlinkDocument}
                    title="Unlink file"
                    className="text-muted-foreground/30 hover:text-destructive transition-colors p-0.5"
                  >
                    <Link2Off className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Paperclip className="w-3 h-3" />
                      Link file
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-52 overflow-y-auto">
                    {!documents || documents.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                        No files in Data Room yet.
                      </div>
                    ) : (
                      documents.map((doc) => (
                        <DropdownMenuItem
                          key={doc.id}
                          onClick={() => onLinkDocument?.(doc.id)}
                          className="gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-xs truncate">{doc.name}</p>
                            {doc.category && (
                              <p className="text-[10px] text-muted-foreground/60">{doc.category}</p>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>
      </div>

      {/* Skip form — inline, below the row */}
      {showSkipForm && (
        <div className="border-t border-amber-200/60 bg-amber-50/30 px-4 py-3 space-y-2">
          <p className="text-[11px] font-medium text-amber-700">Reason for skipping</p>
          <select
            value={skipSelection}
            onChange={(e) => setSkipSelection(e.target.value)}
            className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select a reason…</option>
            {SKIP_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {skipSelection === "Other (please specify)" && (
            <input
              type="text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Please specify…"
              autoFocus
              className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleSkipCancel}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isSkipValid}
              onClick={handleSkipConfirm}
              className={cn(
                "text-xs font-medium px-3 py-1 rounded-md transition-colors",
                isSkipValid
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Skip Item
            </button>
          </div>
        </div>
      )}

      {/* Subtask accordion */}
      {expanded && !isSkipped && (
        <div className="border-t border-border/40 bg-muted/5 pl-10 pr-4 pb-3 pt-2 space-y-1.5">
          {subtasks.length === 0 && (
            <p className="text-[11px] text-muted-foreground/40 italic py-0.5">No subtasks yet.</p>
          )}
          {subtasks.map((subtask, idx) => (
            <div key={idx} className="flex items-center gap-2 group/sub">
              <button type="button" onClick={() => handleToggleSubtask(idx)} className="flex-shrink-0">
                {subtask.done ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-muted-foreground/40" />
                )}
              </button>
              <span className={cn(
                "text-xs flex-1 leading-snug",
                subtask.done ? "line-through text-muted-foreground/60" : "text-foreground/80"
              )}>
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteSubtask(idx)}
                className="opacity-0 group-hover/sub:opacity-100 text-muted-foreground/30 hover:text-destructive transition-opacity flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add subtask input */}
          <div className="flex items-center gap-2 pt-0.5">
            <Plus className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSubtask();
                if (e.key === "Escape") setNewTitle("");
              }}
              placeholder="Add subtask…"
              className="flex-1 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/30"
            />
            {newTitle.trim() && (
              <button type="button" onClick={handleAddSubtask} className="text-[10px] text-primary font-medium flex-shrink-0">
                Add
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
