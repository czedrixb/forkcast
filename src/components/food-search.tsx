"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { searchFoods, logFood, createCustomFood } from "@/actions/log";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type Food = {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function FoodSearch({ initialMeal }: { initialMeal: MealType }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [mealType, setMealType] = useState<MealType>(initialMeal);
  const [customOpen, setCustomOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const found = await searchFoods(query);
        setResults(found);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  function handleAdd(food: Food) {
    startTransition(async () => {
      await logFood({
        mealType,
        quantity: 1,
        unit: `${food.servingSize} ${food.servingUnit}`,
        kcal: food.kcal,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        foodId: food.id,
        source: "search",
      });
      router.push("/today");
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-8 pb-8">
      <h1 className="mb-4 font-display text-xl font-semibold">Add food</h1>

      <div className="mb-3">
        <label className="mb-1.5 block text-sm font-medium text-muted">Meal</label>
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

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods…"
          className="pl-11"
          autoFocus
        />
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {results.map((food) => (
          <motion.button
            key={food.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleAdd(food)}
            disabled={isPending}
            className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-left hover:bg-surface disabled:opacity-60"
          >
            <div>
              <p className="text-sm font-medium">{food.name}</p>
              <p className="text-xs text-muted">
                {food.servingSize} {food.servingUnit} · {Math.round(food.kcal)} kcal
              </p>
            </div>
            <Plus className="h-4 w-4 text-accent-ink" />
          </motion.button>
        ))}

        {query.trim() && results.length === 0 && !isPending && (
          <p className="mt-6 text-center text-sm text-muted">No matches. Try a custom food instead.</p>
        )}
      </div>

      <Button variant="outline" size="lg" className="mt-4" onClick={() => setCustomOpen(true)}>
        Create custom food
      </Button>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogTitle className="mb-4">Custom food</DialogTitle>
          <CustomFoodForm
            mealType={mealType}
            onDone={() => {
              setCustomOpen(false);
              router.push("/today");
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}

function CustomFoodForm({ mealType, onDone }: { mealType: MealType; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const food = await createCustomFood({
        name: String(formData.get("name")),
        servingSize: Number(formData.get("servingSize")),
        servingUnit: String(formData.get("servingUnit")),
        kcal: Number(formData.get("kcal")),
        protein: Number(formData.get("protein")),
        carbs: Number(formData.get("carbs")),
        fat: Number(formData.get("fat")),
      });
      await logFood({
        mealType,
        quantity: 1,
        unit: `${food.servingSize} ${food.servingUnit}`,
        kcal: food.kcal,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        foodId: food.id,
        source: "manual",
      });
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <Input name="name" placeholder="Food name" required />
      <div className="grid grid-cols-2 gap-3">
        <Input name="servingSize" type="number" placeholder="Serving size" required />
        <Input name="servingUnit" placeholder="Unit (g, cup…)" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="kcal" type="number" placeholder="Calories" required />
        <Input name="protein" type="number" placeholder="Protein (g)" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="carbs" type="number" placeholder="Carbs (g)" required />
        <Input name="fat" type="number" placeholder="Fat (g)" required />
      </div>
      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Saving…" : "Save & log"}
      </Button>
    </form>
  );
}
