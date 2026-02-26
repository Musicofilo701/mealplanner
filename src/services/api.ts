import { MealPlanFormData, ShoppingListCategory } from '../types';
import { GoogleGenAI, Type } from '@google/genai';

export const generateMealPlan = async (data: MealPlanFormData) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  let mealsDescription = '';
  if (data.mealsPerDay === 1) mealsDescription = '1 meal per day (Lunch)';
  else if (data.mealsPerDay === 2) mealsDescription = '2 meals per day (Lunch and Dinner)';
  else mealsDescription = '3 meals per day (Breakfast, Lunch, and Dinner)';

  const prompt = `Generate a meal plan from ${data.startDate} to ${data.endDate}.
  It's ok to cook a meal and eat it in two different occasions if the time of the meal plan is longer than 3 days, but don't make it happen too much. Please provide all the information and the text in Italian.
  Requirements:
  - Meals per day: ${mealsDescription}
  - Calories level: ${data.caloriesLevel}
  - Vegetarian: ${data.vegetarian ? 'Yes' : 'No'}
  - Red Meat allowed: ${data.redMeat ? 'Yes' : 'No'}
  - Budget-friendly: ${data.budgetFriendly ? 'Yes' : 'No'}
  - Additional notes: ${data.notes || 'None'}
  
  For each meal, provide:
  1. A descriptive recipe name.
  2. A detailed list of ingredients with exact measurements and quantities.
  3. Comprehensive, step-by-step cooking instructions that are clear, specific, and easy to follow for a home cook. Do not skip any steps.
  4. Estimated calories.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
            meal_type: { type: Type.STRING, description: "e.g., Breakfast, Lunch, Dinner" },
            recipe_name: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            calories: { type: Type.INTEGER }
          },
          required: ["date", "meal_type", "recipe_name", "ingredients", "instructions", "calories"]
        }
      }
    }
  });

  const mealPlan = JSON.parse(response.text || "[]");

  const saveResponse = await fetch('/api/meals/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mealPlan, startDate: data.startDate, endDate: data.endDate }),
  });

  if (!saveResponse.ok) {
    throw new Error('Failed to save meal plan');
  }

  return saveResponse.json();
};

export const fetchMeals = async (startDate: string, endDate: string) => {
  const response = await fetch(`/api/meals?startDate=${startDate}&endDate=${endDate}`);
  if (!response.ok) {
    throw new Error('Failed to fetch meals');
  }
  return response.json();
};

export const toggleSkipMeal = async (id: number, skipped: boolean) => {
  const response = await fetch(`/api/meals/${id}/skip`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ skipped }),
  });

  if (!response.ok) {
    throw new Error('Failed to skip meal');
  }

  return response.json();
};

export const deleteMeal = async (id: number) => {
  const response = await fetch(`/api/meals/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete meal');
  }

  return response.json();
};

export const generateShoppingList = async (ingredients: string[]): Promise<ShoppingListCategory[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `I have a list of ingredients from various recipes. Please consolidate them into a clean, categorized shopping list. Combine similar items and sum up quantities if possible.
  
  Ingredients list:
  ${ingredients.join('\n')}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "e.g., Produce, Dairy, Meat, Pantry" },
            items: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["category", "items"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};
