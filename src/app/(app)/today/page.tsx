import { redirect } from "next/navigation";
import { Flame } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getDayData, getStreak } from "@/lib/queries/today";
import { CalorieRing } from "@/components/calorie-ring";
import { MacroBars } from "@/components/macro-bars";
import { MealSection } from "@/components/meal-section";
import { WaterTracker } from "@/components/water-tracker";

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user || !user.profile) redirect("/login");

  const [{ byMeal, totals, waterMl }, streak] = await Promise.all([
    getDayData(user.id),
    getStreak(user.id),
  ]);

  const { profile } = user;

  return (
    <main className="mx-auto max-w-md px-5 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Good to see you,</p>
          <h1 className="font-display text-xl font-semibold">{user.name.split(" ")[0]}</h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium">
            <Flame className="h-4 w-4 text-carbs" />
            {streak} day{streak === 1 ? "" : "s"}
          </div>
        )}
      </header>

      <div className="mb-6 flex justify-center">
        <CalorieRing consumed={totals.kcal} target={profile.calorieTarget} />
      </div>

      <div className="mb-6 rounded-[28px] border border-border bg-surface p-5">
        <MacroBars
          protein={totals.protein}
          proteinTarget={profile.proteinTarget}
          carbs={totals.carbs}
          carbTarget={profile.carbTarget}
          fat={totals.fat}
          fatTarget={profile.fatTarget}
        />
      </div>

      <div className="mb-6">
        <WaterTracker totalMl={waterMl} />
      </div>

      <div className="flex flex-col gap-6 pb-6">
        <MealSection mealType="breakfast" entries={byMeal.breakfast} />
        <MealSection mealType="lunch" entries={byMeal.lunch} />
        <MealSection mealType="dinner" entries={byMeal.dinner} />
        <MealSection mealType="snack" entries={byMeal.snack} />
      </div>
    </main>
  );
}
