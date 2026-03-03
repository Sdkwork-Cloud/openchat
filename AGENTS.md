# OpenChat React PC - Agent Guidelines

## Project Overview

- **Tech Stack**: React 18+, TypeScript 5+, Vite 5+, Tailwind CSS, Zustand, React Query
- **Path Alias**: `@/*` maps to `./src/*`
- **TypeScript**: Strict mode enabled

## Build, Test, and Development Commands

```bash
# Development
npm run dev          # Start dev server (development mode)
npm run dev:test     # Start dev server (test mode)
npm run dev:prod     # Start dev server (production mode)
npm run dev:desktop  # Start Tauri desktop app

# Build
npm run build        # Build production (tsc + vite)
npm run build:dev    # Build development version
npm run build:test   # Build test version
npm run build:prod   # Build production version
npm run build:desktop # Build Tauri desktop app

# Testing
npm run test              # Run all tests (Vitest)
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm test -- path/to/test # Run single test file (Vitest)

# Linting & Formatting
npm run lint    # ESLint check
npm run format  # Prettier fix

# Preview
npm run preview      # Preview production build
npm run preview:test # Preview test build
npm run preview:prod # Preview production build
```

## Code Style Guidelines

### General Principles

- Use TypeScript with strict mode enabled
- Avoid `any` type; use proper typing or `unknown`
- Follow existing code patterns in the codebase

### Naming Conventions

- **Components/PascalCase**: `useAuthStore.ts` → `useAuthStore`
- **Files**: camelCase for utilities, PascalCase for components/classes
- **Interfaces/Types**: PascalCase with `Type` suffix for types (e.g., `ToastType`)
- **Store**: Use Zustand with `useXxxStore` naming

### Import Order

1. External libraries (React, React Router, etc.)
2. Internal services/API (`@/services/*`)
3. Components (`@/components/*`)
4. Hooks (`@/hooks/*`)
5. Utils (`@/utils/*`)
6. Types (`@/types/*`)
7. Relative imports

```typescript
// Example import order
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import authApi, { type User, type LoginParams } from "@/services/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/utils/date";
import type { ApiResponse } from "@/types/api";
import "./styles.css";
```

### State Management

- Use **Zustand** with Immer middleware for global state
- Use **React Query** (`@tanstack/react-query`) for server state
- Follow existing patterns in `src/store/*.store.ts`

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      // state + actions
    })),
    { name: "auth-storage" },
  ),
);
```

### Component Patterns

- Use functional components with hooks
- Export components as named exports
- Include JSDoc comments for hooks and complex functions

```typescript
/**
 * Hook description
 */
export function useToast() {
  // hook implementation
  return { showToast };
}
export default useToast;
```

### Error Handling

- Use try/catch for async operations
- Set error state in catch blocks
- Use `err: any` when TypeScript inference fails (rare)

```typescript
try {
  const response = await apiCall();
  // handle success
} catch (err: any) {
  set((draft) => {
    draft.error = err.message || "Default error";
  });
  throw err;
}
```

### Tailwind CSS

- Use utility classes from Tailwind CSS
- Use `clsx` and `tailwind-merge` (`cn()`) for conditional classes

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn('base-class', isActive && 'active-class')} />
```

### Testing

- Test files: `*.test.ts` or `*.spec.ts` colocated with source
- Use Vitest with jsdom environment
- Use `@testing-library/react` for component testing

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("ComponentName", () => {
  it("should render", () => {
    // test implementation
  });
});
```

### File Organization

```
src/
├── app/              # App root components
├── components/       # Reusable UI components
├── services/         # API services
├── hooks/            # Custom React hooks
├── store/            # Zustand stores
├── utils/            # Utility functions
├── types/            # TypeScript types
├── i18n/             # Internationalization
├── tests/            # Test setup files
└── pages/            # Page components
```

### Key Libraries

- **UI**: Tailwind CSS, lucide-react (icons)
- **State**: zustand (with immer, persist middleware)
- **Data**: @tanstack/react-query
- **Routing**: react-router-dom
- **Editor**: @tiptap (rich text)
- **i18n**: i18next, react-i18next

## Important Notes

- This project uses Vite with multiple modes (development, test, production)
- Path aliases configured in tsconfig.json and vite.config.ts
- Zustand stores use Immer for immutable updates
- ESLint rules include TypeScript and React-specific checks
- Coverage thresholds: 80% lines/functions, 70% branches
