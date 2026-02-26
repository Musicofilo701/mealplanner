import express from "express";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { MealPlan, MealPlanFormData, ShoppingListCategory } from './types';

dotenv.config();

// Configurazione Pool per PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessario per le connessioni sicure su Render/Supabase
  }
});

// Inizializzazione DB (Postgres usa SERIAL invece di AUTOINCREMENT)
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        recipe_name TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        instructions TEXT NOT NULL,
        calories INTEGER,
        skipped BOOLEAN DEFAULT FALSE,
        UNIQUE(date, meal_type)
      );
    `);
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
};

initDb();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/meals", async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    try {
      // Postgres usa $1, $2 invece di ?
      const result = await pool.query(
        "SELECT * FROM meal_plans WHERE date >= $1 AND date <= $2 ORDER BY date ASC, meal_type ASC",
        [startDate, endDate]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch meals" });
    }
  });

  app.post("/api/meals/save", async (req, res) => {
    const { mealPlan, startDate, endDate } = req.body;
    if (!Array.isArray(mealPlan)) {
      return res.status(400).json({ error: "Invalid meal plan data" });
    }

    // Nota: Postgres non ha le transazioni identiche a SQLite3, usiamo una logica sequenziale sicura
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (startDate && endDate) {
        await client.query("DELETE FROM meal_plans WHERE date >= $1 AND date <= $2", [startDate, endDate]);
      }

      const insertQuery = `
        INSERT INTO meal_plans (date, meal_type, recipe_name, ingredients, instructions, calories, skipped)
        VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      `;

      for (const meal of mealPlan) {
        await client.query(insertQuery, [
          meal.date,
          meal.meal_type,
          meal.recipe_name,
          JSON.stringify(meal.ingredients),
          JSON.stringify(meal.instructions),
          meal.calories
        ]);
      }

      await client.query('COMMIT');
      res.json({ success: true, count: mealPlan.length });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error saving meal plan:", error);
      res.status(500).json({ error: "Failed to save meal plan" });
    } finally {
      client.release();
    }
  });

  app.put("/api/meals/:id/skip", async (req, res) => {
    const { id } = req.params;
    const { skipped } = req.body;
    try {
      await pool.query("UPDATE meal_plans SET skipped = $1 WHERE id = $2", [skipped, id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.delete("/api/meals/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM meal_plans WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete meal" });
    }
  });

  // Vite middleware for development / Static files for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();