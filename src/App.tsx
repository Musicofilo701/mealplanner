import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Calendar, ChefHat, ChevronLeft, ChevronRight, Loader2, Settings, Utensils, X, Check, RefreshCw, ShoppingCart } from 'lucide-react';
import { generateMealPlan, fetchMeals, toggleSkipMeal, generateShoppingList } from './services/api';
import { MealPlan, MealPlanFormData, ShoppingListCategory } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealPlan | null>(null);

  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [shoppingListLoading, setShoppingListLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingListCategory[] | null>(null);
  const [selectedMealsForShopping, setSelectedMealsForShopping] = useState<Set<number>>(new Set());

  const [formData, setFormData] = useState<MealPlanFormData>({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 6), 'yyyy-MM-dd'),
    mealsPerDay: 3,
    caloriesLevel: 'medium',
    vegetarian: false,
    redMeat: true,
    budgetFriendly: true,
    notes: '',
  });

  const loadMeals = async () => {
    try {
      const start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const end = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const data = await fetchMeals(start, end);
      setMeals(data);
    } catch (error) {
      console.error('Failed to load meals', error);
    }
  };

  useEffect(() => {
    loadMeals();
  }, [currentDate]);

  useEffect(() => {
    if (showSettings || selectedMeal || showShoppingModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSettings, selectedMeal, showShoppingModal]);

  const handleOpenShoppingModal = () => {
    const weekMeals = meals.filter(m => !m.skipped);
    setSelectedMealsForShopping(new Set(weekMeals.map(m => m.id)));
    setShoppingList(null);
    setShowShoppingModal(true);
  };

  const handleGenerateShoppingList = async () => {
    setShoppingListLoading(true);
    try {
      const selectedIngredients: string[] = [];
      meals.forEach(m => {
        if (selectedMealsForShopping.has(m.id)) {
          const ings = JSON.parse(m.ingredients);
          selectedIngredients.push(...ings);
        }
      });
      
      if (selectedIngredients.length === 0) {
        alert("Please select at least one meal.");
        setShoppingListLoading(false);
        return;
      }

      const list = await generateShoppingList(selectedIngredients);
      setShoppingList(list);
    } catch (error) {
      console.error('Failed to generate shopping list', error);
      alert('Failed to generate shopping list. Please try again.');
    } finally {
      setShoppingListLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await generateMealPlan(formData);
      await loadMeals();
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to generate plan', error);
      alert('Failed to generate meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipToggle = async (meal: MealPlan) => {
    try {
      await toggleSkipMeal(meal.id, !meal.skipped);
      setMeals(meals.map(m => m.id === meal.id ? { ...m, skipped: !m.skipped } : m));
      if (selectedMeal?.id === meal.id) {
        setSelectedMeal({ ...meal, skipped: !meal.skipped });
      }
    } catch (error) {
      console.error('Failed to toggle skip', error);
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const mealsForSelectedDate = meals.filter(m => m.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="min-h-screen bg-zinc-50 text-black font-sans">
      <header className="bg-black text-white border-b-4 border-red-600 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 text-white">
              <ChefHat size={24} />
            </div>
            <h1 className="text-2xl font-display uppercase tracking-wider">AI Meal Planner</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenShoppingModal}
              className="p-2 hover:bg-zinc-800 transition-colors flex items-center gap-2 text-white"
              title="Shopping List"
            >
              <ShoppingCart size={20} />
              <span className="hidden sm:inline text-sm font-bold uppercase tracking-wider">Shopping List</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-zinc-800 transition-colors"
              title="Plan Settings"
            >
              <Settings size={20} className="text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display uppercase tracking-wider">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(addDays(currentDate, -7))}
                className="p-1.5 hover:bg-zinc-200 bg-white border border-zinc-200 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-1.5 text-sm font-bold uppercase tracking-wider hover:bg-zinc-200 bg-white border border-zinc-200 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(addDays(currentDate, 7))}
                className="p-1.5 hover:bg-zinc-200 bg-white border border-zinc-200 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                {day}
              </div>
            ))}
            {daysInWeek.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayMeals = meals.filter(m => m.date === dateStr);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center p-3 transition-all border-2 ${isSelected ? 'bg-red-600 text-white border-red-600 shadow-md' : 'hover:bg-zinc-100 bg-white border-transparent'}`}
                >
                  <span className={`text-lg font-display ${isSelected ? '' : isToday ? 'text-red-600' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex gap-1 mt-1 h-1.5">
                    {dayMeals.map((m, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 ${m.skipped ? 'bg-zinc-300' : isSelected ? 'bg-white' : 'bg-red-600'}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-display uppercase tracking-wider mb-6 flex items-center gap-2 border-b-2 border-zinc-200 pb-2">
            <Calendar size={24} className="text-red-600" />
            {isSameDay(selectedDate, new Date()) ? "Today's Plan" : format(selectedDate, 'EEEE, MMMM d')}
          </h3>

          {mealsForSelectedDate.length === 0 ? (
            <div className="bg-white border-2 border-zinc-200 border-dashed p-10 text-center">
              <div className="w-16 h-16 bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <Utensils className="text-zinc-400" size={32} />
              </div>
              <p className="text-zinc-600 mb-6 font-medium">No meals planned for this day.</p>
              <button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    startDate: format(selectedDate, 'yyyy-MM-dd'),
                    endDate: format(addDays(selectedDate, 6), 'yyyy-MM-dd')
                  }));
                  setShowSettings(true);
                }}
                className="px-6 py-3 bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-700 transition-colors"
              >
                Generate Plan
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mealsForSelectedDate.map(meal => (
                <div
                  key={meal.id}
                  className={`bg-white border-2 transition-all ${meal.skipped ? 'border-zinc-200 opacity-60' : 'border-black shadow-sm hover:shadow-md'}`}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-white bg-black px-3 py-1">
                        {meal.meal_type}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-1">
                          {meal.calories} KCAL
                        </span>
                      </div>
                    </div>
                    
                    <h4 className={`text-xl font-display uppercase leading-tight mb-4 ${meal.skipped ? 'line-through text-zinc-500' : ''}`}>
                      {meal.recipe_name}
                    </h4>
                    
                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={() => setSelectedMeal(meal)}
                        className="flex-1 py-2 bg-black hover:bg-zinc-800 text-white text-sm font-bold uppercase tracking-wider transition-colors"
                      >
                        View Recipe
                      </button>
                      <button
                        onClick={() => handleSkipToggle(meal)}
                        className={`px-4 py-2 text-sm font-bold transition-colors ${meal.skipped ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                        title={meal.skipped ? "Unskip meal" : "Skip meal"}
                      >
                        {meal.skipped ? <Check size={18} /> : <X size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedMeal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedMeal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border-t-4 border-red-600 shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-200 flex justify-between items-start sticky top-0 bg-white z-10 shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white bg-black px-2 py-1">
                      {selectedMeal.meal_type}
                    </span>
                    <span className="text-xs font-bold text-zinc-500">
                      {selectedMeal.calories} KCAL
                    </span>
                  </div>
                  <h2 className="text-3xl font-display uppercase leading-tight">{selectedMeal.recipe_name}</h2>
                </div>
                <button
                  onClick={() => setSelectedMeal(null)}
                  className="p-2 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <h3 className="text-lg font-display uppercase tracking-wider text-black mb-4 border-b-2 border-red-600 pb-2">
                      Ingredients
                    </h3>
                    <ul className="space-y-3">
                      {JSON.parse(selectedMeal.ingredients).map((ing: string, i: number) => (
                        <li key={i} className="text-sm text-zinc-700 flex items-start gap-3 font-medium">
                          <div className="w-2 h-2 bg-red-600 mt-1.5 shrink-0" />
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-display uppercase tracking-wider text-black mb-4 border-b-2 border-red-600 pb-2">
                      Instructions
                    </h3>
                    <ol className="space-y-6">
                      {JSON.parse(selectedMeal.instructions).map((inst: string, i: number) => (
                        <li key={i} className="flex gap-4">
                          <span className="flex-shrink-0 w-8 h-8 bg-black text-white text-sm font-display flex items-center justify-center">
                            {i + 1}
                          </span>
                          <p className="text-zinc-700 leading-relaxed font-medium pt-1">{inst}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => handleSkipToggle(selectedMeal)}
                  className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${selectedMeal.skipped ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-white border-2 border-black text-black hover:bg-zinc-100'}`}
                >
                  {selectedMeal.skipped ? 'Unskip Meal' : 'Skip Meal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !loading && setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border-t-4 border-red-600 shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-200 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-display uppercase tracking-wider">Generate Plan</h2>
                <button
                  onClick={() => !loading && setShowSettings(false)}
                  className="p-2 bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleGenerate} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={e => setFormData({...formData, startDate: e.target.value})}
                      className="w-full bg-zinc-50 border-2 border-zinc-200 px-4 py-3 text-sm font-medium focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">End Date</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={e => setFormData({...formData, endDate: e.target.value})}
                      className="w-full bg-zinc-50 border-2 border-zinc-200 px-4 py-3 text-sm font-medium focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Meals per day</label>
                  <div className="flex bg-zinc-100 p-1">
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({...formData, mealsPerDay: num})}
                        className={`flex-1 py-2 text-sm font-bold transition-all ${formData.mealsPerDay === num ? 'bg-black text-white shadow-sm' : 'text-zinc-600 hover:text-black hover:bg-zinc-200'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Calories Level</label>
                  <div className="flex bg-zinc-100 p-1">
                    {['low', 'medium', 'high'].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData({...formData, caloriesLevel: level as any})}
                        className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider transition-all ${formData.caloriesLevel === level ? 'bg-black text-white shadow-sm' : 'text-zinc-600 hover:text-black hover:bg-zinc-200'}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={formData.vegetarian}
                        onChange={e => setFormData({...formData, vegetarian: e.target.checked})}
                        className="peer sr-only"
                      />
                      <div className="w-6 h-6 border-2 border-zinc-300 peer-checked:bg-red-600 peer-checked:border-red-600 transition-colors"></div>
                      <Check size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider text-zinc-700 group-hover:text-black">Vegetarian</span>
                  </label>

                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={formData.redMeat}
                        onChange={e => setFormData({...formData, redMeat: e.target.checked})}
                        className="peer sr-only"
                      />
                      <div className="w-6 h-6 border-2 border-zinc-300 peer-checked:bg-red-600 peer-checked:border-red-600 transition-colors"></div>
                      <Check size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider text-zinc-700 group-hover:text-black">Include Red Meat</span>
                  </label>

                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={formData.budgetFriendly}
                        onChange={e => setFormData({...formData, budgetFriendly: e.target.checked})}
                        className="peer sr-only"
                      />
                      <div className="w-6 h-6 border-2 border-zinc-300 peer-checked:bg-red-600 peer-checked:border-red-600 transition-colors"></div>
                      <Check size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider text-zinc-700 group-hover:text-black">Budget Friendly</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Additional Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="e.g., No dairy, high protein, quick to make..."
                    className="w-full bg-zinc-50 border-2 border-zinc-200 px-4 py-3 text-sm font-medium focus:outline-none focus:border-red-600 min-h-[100px] resize-none transition-colors"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider py-4 transition-colors flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Generating Plan...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={20} />
                        Generate Plan
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs font-medium text-zinc-500 mt-4 uppercase tracking-wider">
                    This will overwrite existing plans for the selected dates.
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShoppingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !shoppingListLoading && setShowShoppingModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border-t-4 border-red-600 shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-200 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-display uppercase tracking-wider">Shopping List</h2>
                <button
                  onClick={() => !shoppingListLoading && setShowShoppingModal(false)}
                  className="p-2 bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  disabled={shoppingListLoading}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {!shoppingList ? (
                  <>
                    <p className="text-zinc-600 mb-4 font-medium">Select the meals you want to include in your shopping list:</p>
                    <div className="space-y-2 mb-6">
                      {meals.length === 0 ? (
                        <p className="text-zinc-500 italic">No meals planned for this week.</p>
                      ) : (
                        meals.map(meal => (
                          <label key={meal.id} className="flex items-center gap-4 p-3 border-2 border-zinc-100 hover:border-zinc-300 cursor-pointer transition-colors">
                            <div className="relative flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selectedMealsForShopping.has(meal.id)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedMealsForShopping);
                                  if (e.target.checked) newSet.add(meal.id);
                                  else newSet.delete(meal.id);
                                  setSelectedMealsForShopping(newSet);
                                }}
                                className="peer sr-only"
                              />
                              <div className="w-6 h-6 border-2 border-zinc-300 peer-checked:bg-red-600 peer-checked:border-red-600 transition-colors"></div>
                              <Check size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-white bg-black px-2 py-0.5">
                                  {meal.meal_type}
                                </span>
                                <span className="text-xs font-bold text-zinc-500">{format(parseISO(meal.date), 'MMM d')}</span>
                              </div>
                              <span className={`text-sm font-bold uppercase tracking-wider text-zinc-800 ${meal.skipped ? 'line-through text-zinc-400' : ''}`}>{meal.recipe_name}</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    <button
                      onClick={handleGenerateShoppingList}
                      disabled={shoppingListLoading || selectedMealsForShopping.size === 0}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider py-4 transition-colors flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {shoppingListLoading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Generating List...
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={20} />
                          Generate Shopping List
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="space-y-8">
                    {shoppingList.map((category, idx) => (
                      <div key={idx}>
                        <h3 className="text-lg font-display uppercase tracking-wider text-black mb-4 border-b-2 border-red-600 pb-2">
                          {category.category}
                        </h3>
                        <ul className="space-y-3">
                          {category.items.map((item, i) => (
                            <li key={i} className="text-sm text-zinc-700 flex items-start gap-3 font-medium">
                              <div className="w-2 h-2 bg-red-600 mt-1.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <button
                      onClick={() => setShoppingList(null)}
                      className="w-full bg-black hover:bg-zinc-800 text-white font-bold uppercase tracking-wider py-4 transition-colors mt-8"
                    >
                      Back to Selection
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
