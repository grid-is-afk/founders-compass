import { useState, useRef } from "react";
import { CheckSquare, Square, ChevronDown, ChevronRight, Plus, X, Paperclip, FileText, Link2Off } from "lucide-react";
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

interface ChecklistItemProps {
  label: string;
  category?: string;
  isDone: boolean;
  subtasks: SubtaskItem[];
  isPending?: boolean;
  onToggle: () => void;
  onSubtasksChange: (subtasks: SubtaskItem[]) => void;
  // Optional document linking (Prove phase only)
  documents?: DocumentOption[];
  linkedDocumentId?: string | null;
  linkedDocumentName?: string | null;
  onLinkDocument?: (documentId: string) => void;
  onUnlinkDocument?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChecklistItem({
  label,
  category,
  isDone,
  subtasks,
  isPending,
  onToggle,
  onSubtasksChange,
  documents,
  linkedDocumentId,
  linkedDocumentName,
  onLinkDocument,
  onUnlinkDocument,
}: ChecklistItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const doneCount = subtasks.filter((s) => s.done).length;
  const hasSubtasks = subtasks.length > 0;
  const hasDocumentFeature = !!documents;

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
      <div className="flex items-center">
        {/* Expand toggle — leftmost so it's immediately visible */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "pl-3 pr-1 py-3 flex-shrink-0 transition-colors",
            expanded
              ? "text-foreground/60"
              : "text-muted-foreground/30 hover:text-muted-foreground/60"
          )}
          title={expanded ? "Collapse subtasks" : "Add or view subtasks"}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Checkbox + label */}
        <button
          type="button"
          disabled={isPending}
          onClick={onToggle}
          className={cn(
            "flex items-center gap-3 flex-1 pr-3 py-3 text-left transition-colors hover:bg-muted/20 min-w-0",
            isPending && "opacity-60 cursor-not-allowed"
          )}
        >
          {isDone ? (
            <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm truncate",
                isDone ? "line-through text-muted-foreground" : "text-foreground"
              )}
            >
              {label}
            </p>
            {category && (
              <p className="text-[10px] text-muted-foreground/60">{category}</p>
            )}
          </div>
          {hasSubtasks && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums flex-shrink-0">
              {doneCount}/{subtasks.length}
            </span>
          )}
        </button>

        {/* Document link area */}
        {hasDocumentFeature && (
          <div className="flex items-center pr-3">
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
                    title="Link a file from the Data Room"
                    className="p-1.5 text-muted-foreground/30 hover:text-primary transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
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
          </div>
        )}
      </div>

      {/* Subtask accordion — indented to align with the label */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/5 pl-10 pr-4 pb-3 pt-2 space-y-1.5">
          {subtasks.length === 0 && (
            <p className="text-[11px] text-muted-foreground/40 italic py-0.5">
              No subtasks yet.
            </p>
          )}
          {subtasks.map((subtask, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <button
                type="button"
                onClick={() => handleToggleSubtask(idx)}
                className="flex-shrink-0"
              >
                {subtask.done ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-muted-foreground/40" />
                )}
              </button>
              <span
                className={cn(
                  "text-xs flex-1 leading-snug",
                  subtask.done ? "line-through text-muted-foreground/60" : "text-foreground/80"
                )}
              >
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteSubtask(idx)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive transition-opacity flex-shrink-0"
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
              <button
                type="button"
                onClick={handleAddSubtask}
                className="text-[10px] text-primary font-medium flex-shrink-0"
              >
                Add
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
