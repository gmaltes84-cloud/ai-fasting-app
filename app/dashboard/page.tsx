"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatDuration(ms: number) {
  if (ms <= 0) return "0m";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatShortDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

type Meal = {
  id: string;
  name: string;
  calories: number;
};

type FastRecord = {
  id: string;
  start: number;
  end: number;
  durationHours: number;
  dayKey: string;
};

function estimateCaloriesFromText(input: string) {
  const text = input.toLowerCase();

  const foodMap: { keyword: string; calories: number }[] = [
    { keyword: "egg", calories: 78 },
    { keyword: "toast", calories: 80 },
    { keyword: "banana", calories: 105 },
    { keyword: "protein shake", calories: 160 },
    { keyword: "chicken salad", calories: 350 },
    { keyword: "chicken", calories: 220 },
    { keyword: "rice", calories: 205 },
    { keyword: "apple", calories: 95 },
    { keyword: "oatmeal", calories: 150 },
    { keyword: "coffee", calories: 5 },
    { keyword: "sandwich", calories: 320 },
    { keyword: "yogurt", calories: 120 },
    { keyword: "burger", calories: 500 },
    { keyword: "pizza", calories: 285 },
  ];

  let total = 0;

  for (const item of foodMap) {
    if (text.includes(item.keyword)) {
      total += item.calories;
    }
  }

  if (text.includes("2 eggs")) total += 78;
  if (text.includes("3 eggs")) total += 156;

  return total > 0 ? total : 200;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isFasting, setIsFasting] = useState(true);
  const [fastStart, setFastStart] = useState<number>(
    Date.now() - 6 * 60 * 60 * 1000
  );
  const [fastStartInput, setFastStartInput] = useState("");
  const [goalHours] = useState<number>(16);
  const [calorieGoal] = useState<number>(2200);
  const [now, setNow] = useState<number>(Date.now());
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [fastHistory, setFastHistory] = useState<FastRecord[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiReply, setAiReply] = useState(
    "Ask something like: How am I doing today?"
  );

  useEffect(() => {
    setMounted(true);

    const savedIsFasting = localStorage.getItem("isFasting");
    const initialIsFasting =
      savedIsFasting === null ? true : savedIsFasting === "true";
    setIsFasting(initialIsFasting);

    const savedFastStart = localStorage.getItem("fastStart");
    const initialFastStart = savedFastStart
      ? Number(savedFastStart)
      : Date.now() - 6 * 60 * 60 * 1000;

    setFastStart(initialFastStart);
    setFastStartInput(formatDateTimeLocal(new Date(initialFastStart)));

    const savedMeals = localStorage.getItem("meals");
    if (savedMeals) {
      setMeals(JSON.parse(savedMeals));
    }

    const savedFastHistory = localStorage.getItem("fastHistory");
    if (savedFastHistory) {
      setFastHistory(JSON.parse(savedFastHistory));
    }

    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, [mounted]);

  const fastMs = isFasting ? now - fastStart : 0;
  const fastHours = isFasting ? fastMs / (1000 * 60 * 60) : 0;

  const totalCalories = useMemo(
    () => meals.reduce((sum, meal) => sum + meal.calories, 0),
    [meals]
  );

  const remainingCalories = calorieGoal - totalCalories;

  const weeklyFastData = useMemo(() => {
    const result: { day: string; fastingHours: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);

      const dayKey = getDateKey(date);

      const totalForDay = fastHistory
        .filter((record) => record.dayKey === dayKey)
        .reduce((sum, record) => sum + record.durationHours, 0);

      result.push({
        day: formatShortDayLabel(date),
        fastingHours: Number(totalForDay.toFixed(1)),
      });
    }

    return result;
  }, [fastHistory]);

  function saveMeals(updated: Meal[]) {
    setMeals(updated);
    localStorage.setItem("meals", JSON.stringify(updated));
  }

  function saveFastHistory(updated: FastRecord[]) {
    setFastHistory(updated);
    localStorage.setItem("fastHistory", JSON.stringify(updated));
  }

  function addMeal() {
    const calories = Number(mealCalories);

    if (!mealName.trim() || !Number.isFinite(calories) || calories <= 0) {
      return;
    }

    const updated = [
      {
        id: crypto.randomUUID(),
        name: mealName.trim(),
        calories,
      },
      ...meals,
    ];

    saveMeals(updated);
    setMealName("");
    setMealCalories("");
  }

  function estimateAndAddMeal() {
    if (!mealName.trim()) {
      return;
    }

    const estimatedCalories = estimateCaloriesFromText(mealName);

    const updated = [
      {
        id: crypto.randomUUID(),
        name: mealName.trim(),
        calories: estimatedCalories,
      },
      ...meals,
    ];

    saveMeals(updated);
    setMealName("");
    setMealCalories("");
  }

  function deleteMeal(id: string) {
    const updated = meals.filter((meal) => meal.id !== id);
    saveMeals(updated);
  }

  function startFastNow() {
    const currentNow = Date.now();
    setIsFasting(true);
    setFastStart(currentNow);
    setFastStartInput(formatDateTimeLocal(new Date(currentNow)));
    localStorage.setItem("isFasting", "true");
    localStorage.setItem("fastStart", String(currentNow));
    setNow(currentNow);
    setAiReply("Fasting started.");
  }

  function stopFastNow() {
    if (!isFasting) {
      setAiReply("You are not currently fasting.");
      return;
    }

    const endTime = Date.now();
    const durationHours = (endTime - fastStart) / (1000 * 60 * 60);

    if (durationHours <= 0) {
      setAiReply("This fast duration is too short to save.");
      return;
    }

    const record: FastRecord = {
      id: crypto.randomUUID(),
      start: fastStart,
      end: endTime,
      durationHours: Number(durationHours.toFixed(1)),
      dayKey: getDateKey(new Date(endTime)),
    };

    const updatedHistory = [...fastHistory, record];
    saveFastHistory(updatedHistory);

    setIsFasting(false);
    localStorage.setItem("isFasting", "false");
    setAiReply(
      `Fast stopped. Logged ${record.durationHours} hours for ${formatShortDayLabel(
        new Date(endTime)
      )}.`
    );
  }

  function saveCustomFastStart() {
    if (!fastStartInput) return;

    const parsed = new Date(fastStartInput).getTime();

    if (!Number.isFinite(parsed)) return;
    if (parsed > Date.now()) {
      setAiReply("Fast start time cannot be in the future.");
      return;
    }

    setIsFasting(true);
    setFastStart(parsed);
    localStorage.setItem("isFasting", "true");
    localStorage.setItem("fastStart", String(parsed));
    setNow(Date.now());
    setAiReply("Fast start time updated.");
  }

  function askCoach() {
    const prompt = aiPrompt.trim().toLowerCase();

    if (!prompt) {
      setAiReply("Type a question first.");
      return;
    }

    if (
      prompt.includes("how am i doing") ||
      prompt.includes("summary") ||
      prompt.includes("today")
    ) {
      setAiReply(
        `You have ${
          isFasting ? `fasted for ${formatDuration(fastMs)}` : "ended your fast"
        } and logged ${totalCalories} calories today. You have ${
          remainingCalories >= 0 ? remainingCalories : 0
        } calories remaining based on your goal.`
      );
      return;
    }

    if (prompt.includes("dinner") || prompt.includes("can i eat")) {
      if (remainingCalories > 0) {
        setAiReply(
          `Yes — based on your current goal, you still have about ${remainingCalories} calories left for the day.`
        );
      } else {
        setAiReply(
          `You can still eat, but you are already ${Math.abs(
            remainingCalories
          )} calories over your goal, so a lighter choice would make more sense.`
        );
      }
      return;
    }

    if (prompt.includes("fast") || prompt.includes("fasting")) {
      if (isFasting) {
        setAiReply(
          `Your current fast is ${formatDuration(
            fastMs
          )}. Your goal is ${goalHours} hours, and you are at ${fastHours.toFixed(
            1
          )} hours right now.`
        );
      } else {
        setAiReply(
          "You are not currently fasting. Press Start Fast Now to begin a new fast."
        );
      }
      return;
    }

    if (
      prompt.includes("meal") ||
      prompt.includes("food") ||
      prompt.includes("eat")
    ) {
      setAiReply(
        `You have logged ${meals.length} meals so far. A future version can estimate calories from plain-English entries automatically.`
      );
      return;
    }

    setAiReply(
      `Based on your current data, you have ${
        isFasting ? `fasted for ${formatDuration(fastMs)}` : "ended your fast"
      }, eaten ${totalCalories} calories, and have ${
        remainingCalories >= 0 ? remainingCalories : 0
      } calories left today.`
    );
  }

  function copySummaryForChatGPT() {
    const mealLines =
      meals.length === 0
        ? "No meals logged yet."
        : meals
            .map((meal) => `- ${meal.name}: ${meal.calories} calories`)
            .join("\n");

    const weeklyLines =
      weeklyFastData.length === 0
        ? "No fasting history yet."
        : weeklyFastData
            .map((day) => `- ${day.day}: ${day.fastingHours} hours`)
            .join("\n");

    const summary = `I want help analyzing my fasting and calorie intake.

Current fasting status: ${isFasting ? "Currently fasting" : "Not currently fasting"}
Current fast: ${isFasting ? formatDuration(fastMs) : "Stopped"}
Fasting goal: ${goalHours} hours
Calories eaten today: ${totalCalories}
Calorie goal: ${calorieGoal}
Remaining calories: ${remainingCalories >= 0 ? remainingCalories : 0}

Meals:
${mealLines}

Last 7 days fasting totals:
${weeklyLines}

Can I still eat dinner? How am I doing today?`;

    navigator.clipboard.writeText(summary);
    setAiReply("Copied! Paste into ChatGPT.");
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-900 text-white p-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400">
            Track your fasting time, log your calories, and ask the AI coach.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Current Fast</h2>
            <div className="mt-3 text-4xl font-bold">
              {isFasting ? formatDuration(fastMs) : "Stopped"}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Goal: {goalHours} hours
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {isFasting
                ? `Progress: ${fastHours.toFixed(1)} / ${goalHours} hours`
                : "Press Start Fast Now to begin a new fast"}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={startFastNow}
                className="rounded-2xl border border-slate-600 px-4 py-2 hover:bg-slate-700"
              >
                Start Fast Now
              </button>

              <button
                onClick={stopFastNow}
                className="rounded-2xl border border-red-500 px-4 py-2 text-red-400 hover:bg-red-500 hover:text-white"
              >
                Stop Fasting
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-sm text-slate-400">
                Set fast start time manually
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-2xl border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                value={fastStartInput}
                onChange={(e) => setFastStartInput(e.target.value)}
              />
              <button
                onClick={saveCustomFastStart}
                className="rounded-2xl border border-slate-600 px-4 py-2 hover:bg-slate-700"
              >
                Save Fast Start Time
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Calories Today</h2>
            <div className="mt-3 text-4xl font-bold">{totalCalories}</div>
            <p className="mt-2 text-sm text-slate-400">Goal: {calorieGoal}</p>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Remaining</h2>
            <div className="mt-3 text-4xl font-bold">
              {remainingCalories >= 0 ? remainingCalories : 0}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {remainingCalories >= 0
                ? "Calories left today"
                : `${Math.abs(remainingCalories)} over goal`}
            </p>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Weekly Fasting Tracker</h2>
          <p className="mt-1 text-sm text-slate-400">
            Total fasting hours logged each day over the last 7 days.
          </p>

          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyFastData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="fastingHours"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Add Meal</h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-2xl border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                  placeholder="Meal name or text like: 2 eggs and toast"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                />
                <input
                  className="rounded-2xl border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                  placeholder="Calories"
                  value={mealCalories}
                  onChange={(e) => setMealCalories(e.target.value)}
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={addMeal}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-500"
                >
                  Add Manual Meal
                </button>

                <button
                  onClick={estimateAndAddMeal}
                  className="rounded-2xl border border-slate-600 px-5 py-3 hover:bg-slate-700"
                >
                  Estimate From Text
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Meal Log</h2>

              <div className="mt-4 space-y-3">
                {meals.length === 0 ? (
                  <p className="text-slate-400">No meals logged yet.</p>
                ) : (
                  meals.map((meal) => (
                    <div
                      key={meal.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-700 p-4"
                    >
                      <div>
                        <div className="font-medium">{meal.name}</div>
                        <div className="text-sm text-slate-400">
                          {meal.calories} calories
                        </div>
                      </div>

                      <button
                        onClick={() => deleteMeal(meal.id)}
                        className="rounded-xl border border-red-500 px-3 py-1 text-sm text-red-400 hover:bg-red-500 hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">AI Coach</h2>

            <div className="mt-4 rounded-2xl bg-slate-700 p-4 text-sm text-slate-200">
              {aiReply}
            </div>

            <textarea
              className="mt-4 min-h-28 w-full rounded-2xl border border-slate-600 bg-slate-900 px-3 py-2 text-white"
              placeholder="Ask something like: Can I still eat dinner tonight?"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={askCoach}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-500"
              >
                Ask AI Coach
              </button>

              <button
                onClick={copySummaryForChatGPT}
                className="rounded-2xl border border-slate-600 px-5 py-3 hover:bg-slate-700"
              >
                Copy for ChatGPT
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}