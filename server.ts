import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { MealPlan, MealPlanFormData, ShoppingListCategory } from './types';
import serverless from 'serverless-http';

dotenv.config();

const db = new Database("meals.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    recipe_name TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    calories INTEGER,
    skipped BOOLEAN DEFAULT 0,
    UNIQUE(date, meal_type)
  );
`);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => ...);

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/meals", (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    const meals = db.prepare("SELECT * FROM meal_plans WHERE date >= ? AND date <= ? ORDER BY date ASC, meal_type ASC").all(startDate, endDate);
    res.json(meals);
  });

  app.post("/api/meals/save", async (req, res) => {
    const { mealPlan, startDate, endDate } = req.body;

    if (!Array.isArray(mealPlan)) {
      return res.status(400).json({ error: "Invalid meal plan data" });
    }

    try {
      const insertMany = db.transaction((meals, start, end) => {
        if (start && end) {
          db.prepare("DELETE FROM meal_plans WHERE date >= ? AND date <= ?").run(start, end);
        }

        const insert = db.prepare(`
          INSERT INTO meal_plans (date, meal_type, recipe_name, ingredients, instructions, calories, skipped)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `);

        for (const meal of meals) {
          insert.run(
            meal.date,
            meal.meal_type,
            meal.recipe_name,
            JSON.stringify(meal.ingredients),
            JSON.stringify(meal.instructions),
            meal.calories
          );
        }
      });

      insertMany(mealPlan, startDate, endDate);

      res.json({ success: true, count: mealPlan.length });
    } catch (error) {
      console.error("Error saving meal plan:", error);
      res.status(500).json({ error: "Failed to save meal plan" });
    }
  });

  app.put("/api/meals/:id/skip", (req, res) => {
    const { id } = req.params;
    const { skipped } = req.body;
    db.prepare("UPDATE meal_plans SET skipped = ? WHERE id = ?").run(skipped ? 1 : 0, id);
    res.json({ success: true });
  });

  app.delete("/api/meals/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM meal_plans WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export const handler = serverless(app)
startServer();
