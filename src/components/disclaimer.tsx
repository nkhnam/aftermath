export function Disclaimer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] px-6 py-3">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-xs text-[var(--text-muted)]">
          AfterMath uses synthetic data. Scores are transparent scenario estimates
          — not financial advice or predictions.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Powered by{" "}
          <span className="font-medium text-[var(--text-secondary)]">Alibaba Cloud</span>
        </p>
      </div>
    </footer>
  );
}
