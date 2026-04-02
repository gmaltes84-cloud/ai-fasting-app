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

function formatMonthDay(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getStartOfWeekSunday(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
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

type WeightEntry = {
  id: string;
  date: string;
  weight: number;
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
  const [fastStart, setFastStart] = useState(Date.now() - 6 * 60 * 60 * 1000);
  const [fastStartInput, setFastStartInput] = useState("");
  const [fastStopInput, setFastStopInput] = useState("");
  const [goalHours] = useState(16);

  const [calorieGoal] = useState(2200);
  const [now, setNow] = useState(Date.now());

  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);

  const [fastHistory, setFastHistory] = useState<FastRecord[]>([]);

  const [weightInput, setWeightInput] = useState("");
  const [weightDateInput, setWeightDateInput] = useState("");
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);

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
    setFastStopInput(formatDateTimeLocal(new Date()));

    const savedMeals = localStorage.getItem("meals");
    if (savedMeals) {
      setMeals(JSON.parse(savedMeals));
    }

    const savedFastHistory = localStorage.getItem("fastHistory");
    if (savedFastHistory) {
      setFastHistory(JSON.parse(savedFastHistory));
    }

    const savedWeightHistory = localStorage.getItem("weightHistory");
    if (savedWeightHistory) {
      setWeightHistory(JSON.parse(savedWeightHistory));
    }

    setWeightDateInput(getDateKey(new Date()));
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const timer = setInterval(() => {
      setNow(Date.now());
      setFastStopInput((current) => current || formatDateTimeLocal(new Date()));
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
    const startOfWeek = getStartOfWeekSunday(new Date());
    const result: { day: string; fastingHours: number; fullLabel: string }[] =
      [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const dayKey = getDateKey(date);
      const totalForDay = fastHistory
        .filter((record) => record.dayKey === dayKey)
        .reduce((sum, record) => sum + record.durationHours, 0);

      result.push({
        day: formatShortDayLabel(date),
        fastingHours: Number(totalForDay.toFixed(1)),
        fullLabel: formatMonthDay(date),
      });
    }

    return result;
  }, [fastHistory]);

  const sortedWeightHistory = useMemo(() => {
    return [...weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  }, [weightHistory]);

  const weightChartData = useMemo(() => {
    return sortedWeightHistory.map((entry) => ({
      date: entry.date,
      label: new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      weight: entry.weight,
    }));
  }, [sortedWeightHistory]);

  const progressStats = useMemo(() => {
    const totalFasts = fastHistory.length;
    const longestFast =
      totalFasts === 0
        ? 0
        : Math.max(...fastHistory.map((record) => record.durationHours));

    const totalWeeklyHours = weeklyFastData.reduce(
      (sum, day) => sum + day.fastingHours,
      0
    );

    const averageFast =
      totalFasts === 0
        ? 0
        : fastHistory.reduce((sum, record) => sum + record.durationHours, 0) /
          totalFasts;

    const firstWeight = sortedWeightHistory[0]?.weight ?? null;
    const latestWeight =
      sortedWeightHistory[sortedWeightHistory.length - 1]?.weight ?? null;

    const weightChange =
      firstWeight !== null && latestWeight !== null
        ? Number((latestWeight - firstWeight).toFixed(1))
        : null;

    return {
      totalFasts,
      longestFast: Number(longestFast.toFixed(1)),
      totalWeeklyHours: Number(totalWeeklyHours.toFixed(1)),
      averageFast: Number(averageFast.toFixed(1)),
      firstWeight,
      latestWeight,
      weightChange,
    };
  }, [fastHistory, weeklyFastData, sortedWeightHistory]);

  function saveMeals(updated: Meal[]) {
    setMeals(updated);
    localStorage.setItem("meals", JSON.stringify(updated));
  }

  function saveFastHistory(updated: FastRecord[]) {
    setFastHistory(updated);
    localStorage.setItem("fastHistory", JSON.stringify(updated));
  }

  function saveWeightHistory(updated: WeightEntry[]) {
    setWeightHistory(updated);
    localStorage.setItem("weightHistory", JSON.stringify(updated));
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

  function addWeightEntry() {
    const weight = Number(weightInput);

    if (!weightDateInput || !Number.isFinite(weight) || weight <= 0) {
      return;
    }

    const updated = [
      ...weightHistory.filter((entry) => entry.date !== weightDateInput),
      {
        id: crypto.randomUUID(),
        date: weightDateInput,
        weight,
      },
    ].sort((a, b) => a.date.localeCompare(b.date));

    saveWeightHistory(updated);
    setWeightInput("");
    setAiReply("Weight entry saved.");
  }

  function deleteWeightEntry(id: string) {
    const updated = weightHistory.filter((entry) => entry.id !== id);
    saveWeightHistory(updated);
  }

  function startFastNow() {
    const currentNow = Date.now();

    setIsFasting(true);
    setFastStart(currentNow);
    setFastStartInput(formatDateTimeLocal(new Date(currentNow)));
    setFastStopInput(formatDateTimeLocal(new Date(currentNow)));

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
    setFastStopInput(formatDateTimeLocal(new Date(endTime)));

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

  function saveCustomFastStop() {
    if (!isFasting) {
      setAiReply("You are not currently fasting.");
      return;
    }

    if (!fastStopInput) {
      setAiReply("Please choose a stop time.");
      return;
    }

    const parsedStop = new Date(fastStopInput).getTime();

    if (!Number.isFinite(parsedStop)) {
      setAiReply("Stop time is not valid.");
      return;
    }

    if (parsedStop > Date.now()) {
      setAiReply("Fast stop time cannot be in the future.");
      return;
    }

    if (parsedStop <= fastStart) {
      setAiReply("Fast stop time must be after the fast start time.");
      return;
    }

    const durationHours = (parsedStop - fastStart) / (1000 * 60 * 60);

    const record: FastRecord = {
      id: crypto.randomUUID(),
      start: fastStart,
      end: parsedStop,
      durationHours: Number(durationHours.toFixed(1)),
      dayKey: getDateKey(new Date(parsedStop)),
    };

    const updatedHistory = [...fastHistory, record];
    saveFastHistory(updatedHistory);

    setIsFasting(false);
    localStorage.setItem("isFasting", "false");
    setNow(parsedStop);

    setAiReply(
      `Backdated fast stop saved. Logged ${record.durationHours} hours for ${formatShortDayLabel(
        new Date(parsedStop)
      )}.`
    );
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
      prompt.includes("today") ||
      prompt.includes("report") ||
      prompt.includes("progress")
    ) {
      const weightMessage =
        progressStats.latestWeight !== null
          ? ` Latest weight: ${progressStats.latestWeight} lbs${
              progressStats.weightChange !== null
                ? ` (${progressStats.weightChange > 0 ? "+" : ""}${progressStats.weightChange} lbs from first entry)`
                : ""
            }.`
          : " No weight logged yet.";

      setAiReply(
        `You have ${
          isFasting ? `fasted for ${formatDuration(fastMs)}` : "ended your fast"
        }, logged ${totalCalories} calories today, and completed ${
          progressStats.totalFasts
        } total fasts. Your average fast is ${
          progressStats.averageFast
        } hours and your longest fast is ${
          progressStats.longestFast
        } hours.${weightMessage}`
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
      prompt.includes("weight") ||
      prompt.includes("scale") ||
      prompt.includes("lbs")
    ) {
      if (progressStats.latestWeight !== null) {
        setAiReply(
          `Your latest logged weight is ${progressStats.latestWeight} lbs.${
            progressStats.weightChange !== null
              ? ` Overall change from your first logged weight is ${
                  progressStats.weightChange > 0 ? "+" : ""
                }${progressStats.weightChange} lbs.`
              : ""
          }`
        );
      } else {
        setAiReply("You have not logged any weight yet.");
      }
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
            .map(
              (day) => `- ${day.day} (${day.fullLabel}): ${day.fastingHours} hours`
            )
            .join("\n");

    const weightLines =
      sortedWeightHistory.length === 0
        ? "No weight entries yet."
        : sortedWeightHistory
            .map((entry) => `- ${entry.date}: ${entry.weight} lbs`)
            .join("\n");

    const summary = `I want help analyzing my fasting, calorie intake, and weight progress.

Current fasting status: ${isFasting ? "Currently fasting" : "Not currently fasting"}
Current fast: ${isFasting ? formatDuration(fastMs) : "Stopped"}
Fasting goal: ${goalHours} hours

Calories eaten today: ${totalCalories}
Calorie goal: ${calorieGoal}
Remaining calories: ${remainingCalories >= 0 ? remainingCalories : 0}

Progress report:
- Total completed fasts: ${progressStats.totalFasts}
- Average fast: ${progressStats.averageFast} hours
- Longest fast: ${progressStats.longestFast} hours
- Current week fasting total: ${progressStats.totalWeeklyHours} hours
- Latest weight: ${
      progressStats.latestWeight !== null
        ? `${progressStats.latestWeight} lbs`
        : "No weight logged"
    }
- Weight change: ${
      progressStats.weightChange !== null
        ? `${progressStats.weightChange > 0 ? "+" : ""}${progressStats.weightChange} lbs`
        : "N/A"
    }

Meals:
${mealLines}

This week (Sunday to Saturday) fasting totals:
${weeklyFastData.length === 0 ? "No fasting history yet." : weeklyLines}

Weight log:
${weightLines}

Can I still eat dinner? How am I doing today?`;

    navigator.clipboard.writeText(summary);
    setAiReply("Copied! Paste into ChatGPT.");
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 text-slate-300">
            Track your fasting time, log your calories, log your weight, and
            review your progress.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm lg:col-span-1">
            <h2 className="text-2xl font-semibold">Current Fast</h2>
            <div className="mt-4 text-5xl font-bold text-cyan-400">
              {isFasting ? formatDuration(fastMs) : "Stopped"}
            </div>
            <p className="mt-3 text-slate-300">Goal: {goalHours} hours</p>
            <p className="mt-2 text-slate-400">
              {isFasting
                ? `Progress: ${fastHours.toFixed(1)} / ${goalHours} hours`
                : "Press Start Fast Now to begin a new fast"}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={startFastNow}
                className="rounded-2xl bg-cyan-600 px-5 py-3 font-medium text-white hover:bg-cyan-500"
              >
                Start Fast Now
              </button>
              <button
                onClick={stopFastNow}
                className="rounded-2xl border border-slate-600 px-5 py-3 font-medium hover:bg-slate-800"
              >
                Stop Fasting Now
              </button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Set fast start time manually
              </label>
              <input
                type="datetime-local"
                value={fastStartInput}
                onChange={(e) => setFastStartInput(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <button
                onClick={saveCustomFastStart}
                className="mt-3 rounded-2xl border border-cyan-600 px-4 py-2 hover:bg-cyan-600/10"
              >
                Save Fast Start Time
              </button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Manually backdate stop time
              </label>
              <input
                type="datetime-local"
                value={fastStopInput}
                onChange={(e) => setFastStopInput(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <button
                onClick={saveCustomFastStop}
                className="mt-3 rounded-2xl border border-emerald-600 px-4 py-2 hover:bg-emerald-600/10"
              >
                Save Backdated Stop Time
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm lg:col-span-1">
            <h2 className="text-2xl font-semibold">Calories Today</h2>
            <div className="mt-4 text-5xl font-bold text-orange-400">
              {totalCalories}
            </div>
            <p className="mt-3 text-slate-300">Goal: {calorieGoal}</p>

            <div className="mt-6 rounded-2xl bg-slate-950 p-4">
              <div className="text-sm uppercase tracking-wide text-slate-400">
                Remaining
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {remainingCalories >= 0 ? remainingCalories : 0}
              </div>
              <div className="mt-1 text-slate-400">
                {remainingCalories >= 0
                  ? "Calories left today"
                  : `${Math.abs(remainingCalories)} over goal`}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold">Add Meal</h3>
              <div className="mt-3 grid gap-3">
                <input
                  type="text"
                  placeholder="Meal name"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                />
                <input
                  type="number"
                  placeholder="Calories"
                  value={mealCalories}
                  onChange={(e) => setMealCalories(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={addMeal}
                  className="rounded-2xl bg-orange-600 px-5 py-3 font-medium text-white hover:bg-orange-500"
                >
                  Add Manual Meal
                </button>
                <button
                  onClick={estimateAndAddMeal}
                  className="rounded-2xl border border-slate-600 px-5 py-3 font-medium hover:bg-slate-800"
                >
                  Estimate From Text
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm lg:col-span-1">
            <h2 className="text-2xl font-semibold">Progress Report</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl bg-slate-950 p-4">
                <div className="text-sm text-slate-400">Completed fasts</div>
                <div className="mt-1 text-3xl font-bold text-white">
                  {progressStats.totalFasts}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4">
                <div className="text-sm text-slate-400">Average fast</div>
                <div className="mt-1 text-3xl font-bold text-white">
                  {progressStats.averageFast} hrs
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4">
                <div className="text-sm text-slate-400">Longest fast</div>
                <div className="mt-1 text-3xl font-bold text-white">
                  {progressStats.longestFast} hrs
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4">
                <div className="text-sm text-slate-400">
                  This week total (Sun-Sat)
                </div>
                <div className="mt-1 text-3xl font-bold text-white">
                  {progressStats.totalWeeklyHours} hrs
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4">
                <div className="text-sm text-slate-400">Latest weight</div>
                <div className="mt-1 text-3xl font-bold text-white">
                  {progressStats.latestWeight !== null
                    ? `${progressStats.latestWeight} lbs`
                    : "--"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4">
                <div className="text-sm text-slate-400">Weight change</div>
                <div className="mt-1 text-3xl font-bold text-white">
                  {progressStats.weightChange !== null
                    ? `${progressStats.weightChange > 0 ? "+" : ""}${progressStats.weightChange} lbs`
                    : "--"}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Weekly Fasting Tracker</h2>
            <p className="mt-2 text-slate-400">
              Fasting hours for the current week, Sunday through Saturday.
            </p>

            <div className="mt-6 h-[288px] min-h-[288px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={300}
                minHeight={288}
              >
                <LineChart data={weeklyFastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => [`${value} hrs`, "Fasting"]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullLabel ?? ""
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="fastingHours"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Weight Log</h2>
            <p className="mt-2 text-slate-400">
              Track your body weight and watch the trend over time.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={weightDateInput}
                onChange={(e) => setWeightDateInput(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Weight (lbs)"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              onClick={addWeightEntry}
              className="mt-3 rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-500"
            >
              Save Weight
            </button>

            <div className="mt-6 h-[256px] min-h-[256px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={300}
                minHeight={256}
              >
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => [`${value} lbs`, "Weight"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#34d399"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-3">
              {sortedWeightHistory.length === 0 ? (
                <div className="rounded-2xl bg-slate-950 p-4 text-slate-400">
                  No weight entries logged yet.
                </div>
              ) : (
                [...sortedWeightHistory].reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-2xl bg-slate-950 p-4"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {entry.weight} lbs
                      </div>
                      <div className="text-sm text-slate-400">
                        {entry.date}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteWeightEntry(entry.id)}
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

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Meal Log</h2>

            <div className="mt-4 space-y-3">
              {meals.length === 0 ? (
                <div className="rounded-2xl bg-slate-950 p-4 text-slate-400">
                  No meals logged yet.
                </div>
              ) : (
                meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between rounded-2xl bg-slate-950 p-4"
                  >
                    <div>
                      <div className="font-medium text-white">{meal.name}</div>
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

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">AI Coach</h2>

            <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-slate-200">
              {aiReply}
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask something like: How am I doing today?"
              className="mt-4 min-h-[120px] w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={askCoach}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-500"
              >
                Ask AI Coach
              </button>
              <button
                onClick={copySummaryForChatGPT}
                className="rounded-2xl border border-slate-600 px-5 py-3 hover:bg-slate-800"
              >
                Copy Progress Report
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
