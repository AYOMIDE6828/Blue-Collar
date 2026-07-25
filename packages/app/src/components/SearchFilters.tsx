"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface SearchFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  urgency: string;
  onUrgencyChange: (value: string) => void;
  categories: Category[];
  onClear?: () => void;
}

export default function SearchFilters({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  urgency,
  onUrgencyChange,
  categories,
  onClear,
}: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = categoryId || urgency;

  const handleClear = () => {
    onCategoryChange("");
    onUrgencyChange("");
    onClear?.();
  };

  const handleFilterToggle = () => {
    setShowFilters((prev) => !prev);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFilterToggle();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="job-search" className="sr-only">Search jobs</label>
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="job-search"
            type="text"
            placeholder="Search jobs…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search jobs by title or keywords"
          />
        </div>
        <button
          onClick={handleFilterToggle}
          onKeyDown={handleFilterKeyDown}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
            showFilters
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : "bg-white text-gray-600 hover:bg-gray-50",
          )}
          aria-label={showFilters ? "Hide filters" : "Show filters"}
          aria-expanded={showFilters}
          aria-controls="filters-panel"
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> Filters
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div
          id="filters-panel"
          className="rounded-xl border bg-gray-50 p-4"
          role="region"
          aria-label="Job filters"
        >
          <fieldset className="flex flex-wrap gap-3">
            <legend className="sr-only">Filter jobs by category and urgency</legend>

            <div className="flex flex-col gap-1">
              <label htmlFor="category-select" className="text-xs font-medium text-gray-600">
                Category
              </label>
              <select
                id="category-select"
                value={categoryId}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter jobs by category"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="urgency-select" className="text-xs font-medium text-gray-600">
                Urgency
              </label>
              <select
                id="urgency-select"
                value={urgency}
                onChange={(e) => onUrgencyChange(e.target.value)}
                className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter jobs by urgency level"
              >
                <option value="">Any urgency</option>
                <option value="urgent">🔴 Urgent</option>
                <option value="normal">🔵 Normal</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClear}
                className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors self-end"
                aria-label="Clear all active filters"
              >
                Clear
              </button>
            )}
          </fieldset>
        </div>
      )}
    </div>
  );
}
