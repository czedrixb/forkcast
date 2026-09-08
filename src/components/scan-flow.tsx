"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ScanCamera } from "@/components/scan-camera";
import { ScanOverlay } from "@/components/scan-overlay";
import { DetectedFoodList, scaleFood, type EditableFood } from "@/components/detected-food-list";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { blobToDataUrl, compressImage, dataUrlToBlob } from "@/lib/image";
import { logDetectedFoods } from "@/actions/log";
import type { AnalysisModel } from "@/lib/ai/types";

type Stage = "idle" | "preview" | "analyzing" | "results" | "error";
type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export function ScanFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [items, setItems] = useState<EditableFood[]>([]);
  const [model, setModel] = useState<AnalysisModel | null>(null);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSelect(file: File) {
    const rawDataUrl = await blobToDataUrl(file);
    const compressed = await compressImage(rawDataUrl);
    setImageDataUrl(compressed);
    setStage("preview");
  }

  async function handleAnalyze() {
    if (!imageDataUrl) return;
    setStage("analyzing");
    setError(null);

    try {
      const blob = dataUrlToBlob(imageDataUrl);
      const formData = new FormData();
      formData.append("image", blob, "scan.jpg");

      const res = await fetch("/api/scan", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      setImagePath(data.imagePath);
      setItems(data.foods.map((f: EditableFood) => ({ ...f, multiplier: 1 })));
      setModel(data.model);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-8">
      <h1 className="mb-6 font-display text-xl font-semibold">Scan food</h1>

      {stage === "idle" && <ScanCamera onSelect={handleSelect} />}

      {(stage === "preview" || stage === "analyzing" || stage === "error") && imageDataUrl && (
        <div className="flex flex-col gap-5">
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageDataUrl} alt="Captured food" className="h-full w-full object-cover" />
            {stage === "analyzing" && <ScanOverlay />}
          </div>

          {stage === "error" && error && (
            <p className="rounded-2xl bg-fat/10 px-4 py-3 text-sm text-fat">{error}</p>
          )}

          <div className="flex gap-3">
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
