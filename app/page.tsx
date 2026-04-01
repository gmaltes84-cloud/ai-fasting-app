import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl rounded-3xl border bg-white p-10 shadow-sm">
        <h1 className="text-4xl font-bold">AI Fasting App</h1>
        <p className="mt-3 text-slate-600">
          Track fasting, calories, and get AI coaching.
        </p>

        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-2xl bg-black px-5 py-3 text-white"
        >
          Open Dashboard
        </Link>
      </div>
    </main>
  );
}