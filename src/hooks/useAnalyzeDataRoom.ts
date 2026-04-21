import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface AnalyzeProgress {
  current: number;
  total: number;
  fileName: string;
  stage: "reading" | "analyzing" | "synthesizing";
}

export interface AnalyzeResult {
  success: boolean;
  updated: string[];
  documentsAnalyzed: number;
  totalDocuments: number;
}

export function useAnalyzeDataRoom(clientId: string) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mutate(
    callbacks: {
      onSuccess?: (result: AnalyzeResult) => void;
      onError?: (message: string) => void;
    } = {}
  ) {
    setIsPending(true);
    setProgress(null);
    setError(null);

    const token = localStorage.getItem("tfo-access-token");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000);

    try {
      const res = await fetch(`/api/clients/${clientId}/analyze-data-room`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === "start") {
            setProgress({ current: 0, total: event.total as number, fileName: "", stage: "reading" });
          } else if (event.type === "file") {
            setProgress({
              current: event.current as number,
              total: event.total as number,
              fileName: event.name as string,
              stage: "reading",
            });
          } else if (event.type === "analyzing") {
            setProgress((prev) => prev ? { ...prev, stage: "analyzing" } : prev);
          } else if (event.type === "synthesizing") {
            setProgress((prev) =>
              prev ? { ...prev, fileName: "Synthesizing results…", stage: "synthesizing" } : prev
            );
          } else if (event.type === "done") {
            const result: AnalyzeResult = {
              success: true,
              updated: event.updated as string[],
              documentsAnalyzed: event.documentsAnalyzed as number,
              totalDocuments: event.totalDocuments as number,
            };
            queryClient.invalidateQueries({ queryKey: ["ipd-metrics", clientId] });
            queryClient.invalidateQueries({ queryKey: ["six-keys", clientId] });
            queryClient.invalidateQueries({ queryKey: ["capital-optionality", clientId] });
            queryClient.invalidateQueries({ queryKey: ["multiples", clientId] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            callbacks.onSuccess?.(result);
          } else if (event.type === "error") {
            const msg = (event.message as string) ?? "Analysis failed";
            setError(msg);
            callbacks.onError?.(msg);
          }
        }
      }
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "AbortError"
          ? "Analysis timed out. Try again or reduce the number of documents."
          : err instanceof Error
          ? err.message
          : "Analysis failed";
      setError(msg);
      callbacks.onError?.(msg);
    } finally {
      clearTimeout(timeoutId);
      setIsPending(false);
      setProgress(null);
    }
  }

  return { mutate, isPending, progress, error };
}
