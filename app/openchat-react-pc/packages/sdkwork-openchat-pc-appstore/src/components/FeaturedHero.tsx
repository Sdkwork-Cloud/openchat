import { memo } from "react";
import type { App } from "../entities/app.entity";

interface FeaturedHeroProps {
  app: App;
  onClick: () => void;
}

export const FeaturedHero = memo(({ app, onClick }: FeaturedHeroProps) => {
  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/20 via-bg-secondary to-bg-primary p-6 text-left transition-all hover:border-primary/40 hover:shadow-xl"
    >
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/25 blur-2xl" />
      <div className="absolute -bottom-10 left-10 h-44 w-44 rounded-full bg-success/15 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-white">TODAY</span>
            {app.editorChoice ? (
              <span className="rounded-full bg-warning px-2 py-1 text-xs font-semibold text-white">EDITOR'S CHOICE</span>
            ) : null}
          </div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-tertiary text-2xl">
              {app.icon}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold text-text-primary">{app.name}</h2>
              <p className="truncate text-sm text-text-tertiary">{app.category.name}</p>
            </div>
          </div>
          <p className="max-w-3xl text-sm text-text-secondary">{app.shortDescription}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
            <span>{app.rating.average.toFixed(1)} rating</span>
            <span>{app.downloads.toLocaleString()} downloads</span>
            <span>{app.developer.name}</span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Tap to open details</span>
          <span className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-transform group-hover:scale-105">
            View Details
          </span>
        </div>
      </div>
    </button>
  );
});

FeaturedHero.displayName = "FeaturedHero";

export default FeaturedHero;
