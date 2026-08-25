export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Foundation ready
      </p>
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Breathe</h1>
      <p className="max-w-md text-sm text-muted-foreground" lang="ar" dir="rtl">
        تنفّس
      </p>
      <p className="max-w-lg text-sm text-muted-foreground">
        Phase 1 scaffold is in place. The reference UI lives in{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">index.html</code>{" "}
        until parity verification completes.
      </p>
    </main>
  );
}
