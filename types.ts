// types.ts
export interface MealPlan {
  id: number;
  date: string;
  meal_type: string;
  recipe_name: string;
  ingredients: string; // JSON string
  instructions: string; // JSON string
  calories: number;
  skipped: boolean;
}

export interface MealPlanFormData {
  startDate: string;
  endDate: string;
  mealsPerDay: number;
  caloriesLevel: 'low' | 'medium' | 'high';
  vegetarian: boolean;
  redMeat: boolean;
  budgetFriendly: boolean;
  notes: string;
}

export interface ShoppingListCategory {
  category: string;
  items: string[];
}