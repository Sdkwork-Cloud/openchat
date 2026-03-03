import { memo } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar = memo(
  ({ value, onChange, placeholder = "Search apps, tags, or capabilities..." }: SearchBarProps) => {
    return (
      <div className="relative">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-border bg-bg-tertiary pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {value ? (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-bg-secondary text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            ×
          </button>
        ) : null}
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";

export default SearchBar;
