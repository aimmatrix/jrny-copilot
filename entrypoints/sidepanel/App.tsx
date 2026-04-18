export default function App() {
  return (
    <main className="min-h-screen bg-neutral-50 p-4 font-sans">
      <header className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600" />
        <h1 className="text-xl font-semibold tracking-tight">JRNY Copilot</h1>
      </header>
      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-neutral-700">
          Extension active on WhatsApp Web.
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          AI suggestions will appear here once Phase 2 ships.
        </p>
      </section>
    </main>
  );
}
