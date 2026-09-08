import { FoodSearch } from "@/components/food-search";

const VALID_MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof VALID_MEALS)[number];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ meal?: string }>;
}) {
  const { meal } = await searchParams;
  const initialMeal: MealType = VALID_MEALS.includes(meal as MealType) ? (meal as MealType) : "lunch";

  return <FoodSearch initialMeal={initialMeal} />;
}
