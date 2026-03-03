import { memo } from "react";
import type { AppCategory } from "../entities/app.entity";

interface CategoryCarouselProps {
  categories: AppCategory[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
}

export const CategoryCarousel = memo(({ categories, selectedId, onSelect }: CategoryCarouselProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((category) => {
        const active = category.id === selectedId;
        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ${
              active
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            <span className="mr-1">{category.icon}</span>
            <span>{category.name}</span>
            <span className={`ml-1 rounded px-1 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-bg-tertiary"}`}>
              {category.appCount}
            </span>
          </button>
        );
      })}
    </div>
  );
});

CategoryCarousel.displayName = "CategoryCarousel";

export default CategoryCarousel;
