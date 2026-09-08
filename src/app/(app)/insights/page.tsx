import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCalorieHistory, getMacroSplit, getWeightHistory, getStreakCalendar } from "@/lib/queries/insights";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CaloriesChart } from "@/components/charts/calories-chart";
import { MacroDonut } from "@/components/charts/macro-donut";
import { WeightChart } from "@/components/charts/weight-chart";
import { StreakHeatmap } from "@/components/charts/streak-heatmap";

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user || !user.profile) redirect("/login");

  const [calories, macros, weight, streak] = await Promise.all([
    getCalorieHistory(user.id, user.profile.calorieTarget),
    getMacroSplit(user.id),
    getWeightHistory(user.id),
    getStreakCalendar(user.id),
  ]);

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-8">
      <h1 className="mb-6 font-display text-xl font-semibold">Insights</h1>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Calories (14 days)</CardTitle>
          </CardHeader>
          <CaloriesChart data={calories} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Macro split</CardTitle>
          </CardHeader>
          <MacroDonut data={macros} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weight trend</CardTitle>
          </CardHeader>
          <WeightChart data={weight} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logging streak</CardTitle>
          </CardHeader>
          <StreakHeatmap cells={streak} />
        </Card>
      </div>
    </main>
  );
}
