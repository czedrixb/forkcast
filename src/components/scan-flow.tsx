"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import { ScanCamera } from "@/components/scan-camera";
import { ScanQuotaSheet } from "@/components/scan-quota-sheet";
import { ScanOverlay } from "@/components/scan-overlay";
import { DetectedFoodList, scaleFood, type EditableFood } from "@/components/detected-food-list";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { blobToDataUrl, compressImage, dataUrlToBlob } from "@/lib/image";
import { logDetectedFoods } from "@/actions/log";
import type { AnalysisModel } from "@/lib/ai/types";
import type { UsageSummary } from "@/lib/billing/usage";

type Stage = "idle" | "preview" | "analyzing" | "results" | "error";
type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type ScanError = { kind: "quota" | "generic"; message: string; resetAt?: string };

function formatResetDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ScanFlow({ initialUsage }: { initialUsage: UsageSummary }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [items, setItems] = useState<EditableFood[]>([]);
  const [model, setModel] = useState<AnalysisModel | null>(null);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [error, setError] = useState<ScanError | null>(null);
  const [usage, setUsage] = useState(initialUsage);
  // One key per selected photo: retrying the *same* photo replays the same
  // request (safe to resend), while picking a new photo always starts a new
  // analysis. Generated client-side with a fallback for browsers/contexts
  // without crypto.randomUUID (e.g. non-HTTPS LAN dev).
  const [requestKey, setRequestKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [quotaSheetOpen, setQuotaSheetOpen] = useState(false);
  const quotaExceeded = usage.remaining <= 0;

  async function handleSelect(file: File) {
    const rawDataUrl = await blobToDataUrl(file);
    const compressed = await compressImage(rawDataUrl);
    setImageDataUrl(compressed);
    setRequestKey(typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    setStage("preview");
  }

  async function handleAnalyze() {
    if (!imageDataUrl || !requestKey) return;
    setStage("analyzing");
    setError(null);

    try {
      const blob = dataUrlToBlob(imageDataUrl);
      const formData = new FormData();
      formData.append("image", blob, "scan.jpg");
      formData.append("requestKey", requestKey);

      const res = await fetch("/api/scan", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        const scanError: ScanError =
          res.status === 402 && data.code === "SCAN_QUOTA_EXCEEDED"
            ? { kind: "quota", message: data.error, resetAt: data.resetAt }
            : { kind: "generic", message: data.error ?? "Analysis failed" };
        setError(scanError);
        setStage("error");
        return;
      }

      setImagePath(data.imagePath);
      setItems(data.foods.map((f: EditableFood) => ({ ...f, multiplier: 1 })));
      setModel(data.model);
      if (data.usage) setUsage(data.usage);
      setStage("results");
    } catch (err) {
      setError({ kind: "generic", message: err instanceof Error ? err.message : "Something went wrong" });
      setStage("error");
    }
  }

  function handleConfirm() {
    startTransition(async () => {
      await logDetectedFoods(items.map(scaleFood), mealType, imagePath ?? undefined);
      router.push("/today");
      router.refresh();
    });
  }

  function reset() {
    setStage("idle");
    setImageDataUrl(null);
    setImagePath(null);
    setItems([]);
    setModel(null);
    setError(null);
    setRequestKey(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-8">
      <h1 className="mb-2 font-display text-xl font-semibold">Scan food</h1>

      <p
        data-testid="scan-usage"
        className="mb-6 flex items-center gap-1.5 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-muted"
      >
        <Zap className="h-4 w-4 shrink-0" />
        {usage.remaining} scan{usage.remaining === 1 ? "" : "s"} left · resets {formatResetDate(usage.resetAt)}
      </p>

      {stage === "idle" && (
        <ScanCamera onSelect={handleSelect} quotaExceeded={quotaExceeded} onBlocked={() => setQuotaSheetOpen(true)} />
      )}

      <ScanQuotaSheet open={quotaSheetOpen} onOpenChange={setQuotaSheetOpen} resetAt={usage.resetAt} />

      {(stage === "preview" || stage === "analyzing" || stage === "error") && imageDataUrl && (
        <div className="flex flex-col gap-5">
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageDataUrl} alt="Captured food" className="h-full w-full object-cover" />
            {stage === "analyzing" && <ScanOverlay />}
          </div>

          {stage === "error" && error && (
            <div data-testid="scan-error" className="flex flex-col gap-1 rounded-2xl bg-fat/10 px-4 py-3 text-sm text-fat">
              <p>{error.message}</p>
              {error.kind === "quota" && error.resetAt && <p className="text-xs opacity-80">Resets {formatResetDate(error.resetAt)}</p>}
            </div>
          )}

          <div className="flex gap-3">
            {stage === "error" && error?.kind === "quota" ? (
              <>
                <Button variant="outline" size="lg" className="flex-1" onClick={() => router.push("/search")}>
                  Add manually
                </Button>
                <Button size="lg" className="flex-1" onClick={() => router.push("/pricing?from=scan")} data-testid="scan-upgrade-cta">
                  Upgrade
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="lg" onClick={reset} disabled={stage === "analyzing"}>
                  Retake
                </Button>
                {stage === "error" ? (
                  <Button size="lg" className="flex-1" onClick={() => router.push("/search")}>
                    Add it manually
                  </Button>
                ) : (
                  <Button size="lg" className="flex-1" onClick={handleAnalyze} disabled={stage === "analyzing"}>
                    {stage === "analyzing" ? "Analyzing…" : "Analyze"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {stage === "results" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5 pb-8">
          {imageDataUrl && (
            <div className="relative aspect-video overflow-hidden rounded-[28px] bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageDataUrl} alt="Scanned food" className="h-full w-full object-cover" />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Log to</label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {model && (
            <p
              data-testid="analysis-model"
              className="flex items-center gap-1.5 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-muted"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              Analyzed by {model.label}
            </p>
          )}

          <DetectedFoodList
            items={items}
            onChange={(i, multiplier) =>
              setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, multiplier } : item)))
            }
            onRemove={(i) => setItems((prev) => prev.filter((_, idx) => idx !== i))}
          />

          <Button size="lg" onClick={handleConfirm} disabled={isPending || items.length === 0}>
            {isPending ? "Logging…" : `Log ${items.length} item${items.length === 1 ? "" : "s"}`}
          </Button>
        </motion.div>
      )}
    </main>
  );
}
