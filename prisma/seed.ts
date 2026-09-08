import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// ~60 common foods, one typical serving each. Nutrition figures are
// approximate USDA-style values — good enough for a demo, not medical advice.
const FOODS: Array<{
  name: string;
  servingSize: number;
  servingUnit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}> = [
  { name: "Chicken breast, grilled", servingSize: 150, servingUnit: "g", kcal: 248, protein: 46, carbs: 0, fat: 5.4, sodium: 110 },
  { name: "Salmon fillet, baked", servingSize: 150, servingUnit: "g", kcal: 280, protein: 39, carbs: 0, fat: 13, sodium: 90 },
  { name: "Ground beef (85% lean), cooked", servingSize: 150, servingUnit: "g", kcal: 310, protein: 36, carbs: 0, fat: 18, sodium: 110 },
  { name: "Scrambled eggs", servingSize: 2, servingUnit: "eggs", kcal: 182, protein: 12, carbs: 1.6, fat: 14, sodium: 170 },
  { name: "Greek yogurt, plain", servingSize: 200, servingUnit: "g", kcal: 130, protein: 20, carbs: 8, fat: 0.8, sugar: 8 },
  { name: "Cottage cheese", servingSize: 150, servingUnit: "g", kcal: 145, protein: 18, carbs: 5, fat: 5, sodium: 320 },
  { name: "Tofu, firm", servingSize: 150, servingUnit: "g", kcal: 140, protein: 15, carbs: 3.5, fat: 8 },
  { name: "Shrimp, cooked", servingSize: 120, servingUnit: "g", kcal: 130, protein: 27, carbs: 1, fat: 1.5, sodium: 180 },
  { name: "Turkey breast, sliced", servingSize: 100, servingUnit: "g", kcal: 135, protein: 24, carbs: 1, fat: 3.5, sodium: 400 },
  { name: "Tuna, canned in water", servingSize: 100, servingUnit: "g", kcal: 116, protein: 26, carbs: 0, fat: 1, sodium: 250 },

  { name: "White rice, cooked", servingSize: 150, servingUnit: "g", kcal: 195, protein: 4, carbs: 42, fat: 0.4 },
  { name: "Brown rice, cooked", servingSize: 150, servingUnit: "g", kcal: 165, protein: 3.8, carbs: 34, fat: 1.3, fiber: 2.2 },
  { name: "Quinoa, cooked", servingSize: 150, servingUnit: "g", kcal: 180, protein: 6.5, carbs: 32, fat: 2.8, fiber: 4 },
  { name: "Oats, rolled, dry", servingSize: 50, servingUnit: "g", kcal: 190, protein: 7, carbs: 32, fat: 3.5, fiber: 5 },
  { name: "Whole wheat bread", servingSize: 2, servingUnit: "slices", kcal: 160, protein: 8, carbs: 28, fat: 2, fiber: 4 },
  { name: "White bread", servingSize: 2, servingUnit: "slices", kcal: 150, protein: 5, carbs: 28, fat: 1.5 },
  { name: "Bagel, plain", servingSize: 1, servingUnit: "bagel", kcal: 245, protein: 10, carbs: 48, fat: 1.5 },
  { name: "Pasta, cooked", servingSize: 180, servingUnit: "g", kcal: 265, protein: 9.5, carbs: 52, fat: 1.5 },
  { name: "Potato, baked", servingSize: 200, servingUnit: "g", kcal: 175, protein: 4.5, carbs: 40, fat: 0.2, fiber: 4.4 },
  { name: "Sweet potato, baked", servingSize: 200, servingUnit: "g", kcal: 180, protein: 3.6, carbs: 41, fat: 0.2, fiber: 6.6 },
  { name: "Tortilla, flour", servingSize: 1, servingUnit: "tortilla", kcal: 140, protein: 4, carbs: 24, fat: 3.5 },
  { name: "Granola", servingSize: 60, servingUnit: "g", kcal: 270, protein: 6, carbs: 40, fat: 10, sugar: 12 },

  { name: "Broccoli, steamed", servingSize: 150, servingUnit: "g", kcal: 51, protein: 4.2, carbs: 10, fat: 0.6, fiber: 4 },
  { name: "Spinach, raw", servingSize: 60, servingUnit: "g", kcal: 14, protein: 1.7, carbs: 2.2, fat: 0.2, fiber: 1.3 },
  { name: "Mixed green salad", servingSize: 100, servingUnit: "g", kcal: 20, protein: 1.5, carbs: 3.8, fat: 0.3, fiber: 1.6 },
  { name: "Avocado", servingSize: 100, servingUnit: "g", kcal: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
  { name: "Carrots, raw", servingSize: 100, servingUnit: "g", kcal: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
  { name: "Bell pepper, raw", servingSize: 100, servingUnit: "g", kcal: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  { name: "Tomato, raw", servingSize: 120, servingUnit: "g", kcal: 22, protein: 1.1, carbs: 4.8, fat: 0.2, fiber: 1.5 },
  { name: "Cucumber, raw", servingSize: 100, servingUnit: "g", kcal: 16, protein: 0.7, carbs: 3.6, fat: 0.1 },
  { name: "Green beans, steamed", servingSize: 120, servingUnit: "g", kcal: 41, protein: 2.2, carbs: 9, fat: 0.2, fiber: 3.8 },

  { name: "Banana", servingSize: 1, servingUnit: "medium", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14 },
  { name: "Apple", servingSize: 1, servingUnit: "medium", kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19 },
  { name: "Orange", servingSize: 1, servingUnit: "medium", kcal: 62, protein: 1.2, carbs: 15.4, fat: 0.2, fiber: 3.1, sugar: 12 },
  { name: "Strawberries", servingSize: 150, servingUnit: "g", kcal: 48, protein: 1, carbs: 11.5, fat: 0.5, fiber: 3, sugar: 7 },
  { name: "Blueberries", servingSize: 150, servingUnit: "g", kcal: 85, protein: 1.1, carbs: 21.5, fat: 0.5, fiber: 3.6, sugar: 15 },
  { name: "Grapes", servingSize: 150, servingUnit: "g", kcal: 104, protein: 1.1, carbs: 27, fat: 0.2, sugar: 23 },
  { name: "Mango", servingSize: 150, servingUnit: "g", kcal: 99, protein: 1.4, carbs: 25, fat: 0.6, fiber: 2.6, sugar: 23 },
  { name: "Watermelon", servingSize: 200, servingUnit: "g", kcal: 60, protein: 1.2, carbs: 15, fat: 0.3, sugar: 12 },

  { name: "Almonds", servingSize: 30, servingUnit: "g", kcal: 174, protein: 6.4, carbs: 6.1, fat: 15, fiber: 3.5 },
  { name: "Peanut butter", servingSize: 30, servingUnit: "g", kcal: 190, protein: 7, carbs: 6, fat: 16 },
  { name: "Walnuts", servingSize: 30, servingUnit: "g", kcal: 196, protein: 4.6, carbs: 4.1, fat: 19.6 },
  { name: "Olive oil", servingSize: 15, servingUnit: "ml", kcal: 120, protein: 0, carbs: 0, fat: 14 },
  { name: "Butter", servingSize: 15, servingUnit: "g", kcal: 108, protein: 0.1, carbs: 0, fat: 12.2 },
  { name: "Cheddar cheese", servingSize: 30, servingUnit: "g", kcal: 120, protein: 7, carbs: 0.4, fat: 10, sodium: 180 },
  { name: "Milk, whole", servingSize: 250, servingUnit: "ml", kcal: 150, protein: 8, carbs: 12, fat: 8, sugar: 12 },
  { name: "Milk, skim", servingSize: 250, servingUnit: "ml", kcal: 85, protein: 8.3, carbs: 12, fat: 0.2, sugar: 12 },
  { name: "Almond milk, unsweetened", servingSize: 250, servingUnit: "ml", kcal: 40, protein: 1, carbs: 2, fat: 3 },

  { name: "Black beans, cooked", servingSize: 150, servingUnit: "g", kcal: 165, protein: 11, carbs: 30, fat: 0.7, fiber: 11 },
  { name: "Chickpeas, cooked", servingSize: 150, servingUnit: "g", kcal: 210, protein: 11, carbs: 35, fat: 3.3, fiber: 9.5 },
  { name: "Lentils, cooked", servingSize: 150, servingUnit: "g", kcal: 172, protein: 13.5, carbs: 30, fat: 0.6, fiber: 11.5 },
  { name: "Hummus", servingSize: 60, servingUnit: "g", kcal: 130, protein: 4, carbs: 12, fat: 8, fiber: 3 },

  { name: "Pizza slice, cheese", servingSize: 1, servingUnit: "slice", kcal: 285, protein: 12, carbs: 36, fat: 10, sodium: 640 },
  { name: "Cheeseburger", servingSize: 1, servingUnit: "burger", kcal: 535, protein: 27, carbs: 40, fat: 29, sodium: 1000 },
  { name: "Caesar salad w/ chicken", servingSize: 1, servingUnit: "bowl", kcal: 470, protein: 32, carbs: 15, fat: 32, sodium: 900 },
  { name: "Sushi roll (California)", servingSize: 8, servingUnit: "pieces", kcal: 255, protein: 9, carbs: 38, fat: 7, sodium: 420 },
  { name: "Chicken burrito bowl", servingSize: 1, servingUnit: "bowl", kcal: 620, protein: 42, carbs: 65, fat: 20, sodium: 1300 },
  { name: "Pad Thai", servingSize: 1, servingUnit: "plate", kcal: 620, protein: 22, carbs: 78, fat: 22, sodium: 1200 },
  { name: "Protein shake", servingSize: 1, servingUnit: "scoop", kcal: 120, protein: 24, carbs: 3, fat: 1.5, sugar: 1 },
  { name: "Dark chocolate", servingSize: 20, servingUnit: "g", kcal: 110, protein: 1.4, carbs: 10, fat: 8, sugar: 6 },
  { name: "Protein bar", servingSize: 1, servingUnit: "bar", kcal: 210, protein: 20, carbs: 22, fat: 7, sugar: 5, fiber: 8 },
];

const DEMO_EMAIL = "demo@forkcast.app";
const DEMO_PASSWORD = "demo1234";

async function main() {
  console.log("Seeding foods...");
  for (const food of FOODS) {
    const existing = await db.food.findFirst({ where: { name: food.name, isCustom: false } });
    if (!existing) {
      await db.food.create({ data: { ...food, isCustom: false } });
    }
  }
  const seededFoods = await db.food.findMany({ where: { isCustom: false } });
  console.log(`  ${seededFoods.length} foods in database.`);

  console.log("Seeding demo user...");
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    user = await db.user.create({
      data: { email: DEMO_EMAIL, name: "Demo User", passwordHash },
    });
  }

  await db.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      sex: "female",
      birthDate: new Date("1994-03-15"),
      heightCm: 168,
      weightKg: 63,
      activityLevel: "moderate",
      goal: "lose",
      calorieTarget: 1750,
      proteinTarget: 130,
      carbTarget: 175,
      fatTarget: 58,
    },
    update: {},
  });

  // Clear old demo history so the seed is idempotent/re-runnable.
  await db.logEntry.deleteMany({ where: { userId: user.id } });
  await db.waterEntry.deleteMany({ where: { userId: user.id } });
  await db.weightEntry.deleteMany({ where: { userId: user.id } });

  console.log("Seeding two weeks of history...");
  const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let weight = 64.2;
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const day = new Date(today);
    day.setDate(day.getDate() - dayOffset);

    // Skip one day out of every ~5 so the streak/heatmap isn't a solid block.
    const skipDay = dayOffset % 5 === 4;
    if (skipDay) continue;

    const mealsToday = dayOffset % 3 === 0 ? MEALS : (["breakfast", "lunch", "dinner"] as const);

    for (const meal of mealsToday) {
      const itemsInMeal = 1 + ((dayOffset + meal.length) % 2);
      for (let i = 0; i < itemsInMeal; i++) {
        const food = seededFoods[(dayOffset * 7 + meal.length * 3 + i * 11) % seededFoods.length];
        const multiplier = 0.8 + (((dayOffset + i) % 5) * 0.1);
        const loggedAt = new Date(day);
        const hourByMeal = { breakfast: 8, lunch: 13, dinner: 19, snack: 16 } as const;
        loggedAt.setHours(hourByMeal[meal], (i * 17) % 60, 0, 0);

        await db.logEntry.create({
          data: {
            userId: user.id,
            foodId: food.id,
            loggedAt,
            mealType: meal,
            quantity: 1,
            unit: `${Math.round(food.servingSize * multiplier)} ${food.servingUnit}`,
            kcal: Math.round(food.kcal * multiplier),
            protein: Math.round(food.protein * multiplier * 10) / 10,
            carbs: Math.round(food.carbs * multiplier * 10) / 10,
            fat: Math.round(food.fat * multiplier * 10) / 10,
            source: "search",
          },
        });
      }
    }

    // Water: 4-8 cups.
    const cups = 4 + (dayOffset % 5);
    for (let c = 0; c < cups; c++) {
      const recordedAt = new Date(day);
      recordedAt.setHours(8 + c * 2, 0, 0, 0);
      await db.waterEntry.create({ data: { userId: user.id, recordedAt, ml: 250 } });
    }

    // Weight: gentle downward trend with noise, logged every other day.
    if (dayOffset % 2 === 0) {
      weight -= 0.05 + ((dayOffset % 3) * 0.03);
      const recordedAt = new Date(day);
      recordedAt.setHours(7, 0, 0, 0);
      await db.weightEntry.create({
        data: { userId: user.id, recordedAt, weightKg: Math.round(weight * 10) / 10 },
      });
    }
  }

  console.log("Seed complete. Demo login: %s / %s", DEMO_EMAIL, DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
