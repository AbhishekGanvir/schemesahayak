import React, { useRef } from 'react';

export default function SectorChips({
  categories,
  categoriesLoading,
  selectedSectorCategory,
  onSelect,
}) {
  const scrollRef = useRef(null);

  const handleWheel = (e) => {
    const el = scrollRef.current;

    if (!el) return;

    // Convert vertical mouse wheel movement into horizontal scrolling
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
        Browse by Sector Category:
      </h3>

      {categoriesLoading ? (
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-pc"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 w-24 shrink-0 rounded-full bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex items-center gap-2 overflow-x-auto pb-2 text-xs scrollbar-pc"
        >
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onSelect(cat.key)}
              className={`px-3.5 cursor-pointer py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedSectorCategory === cat.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50'
              }`}
            >
              <span>{cat.icon}</span>

              <span>{cat.title}</span>

              {cat.count !== null && cat.count !== undefined && (
                <span
                  className={`text-[10px] ${
                    selectedSectorCategory === cat.key
                      ? 'text-blue-100'
                      : 'text-slate-400'
                  }`}
                >
                  ({cat.count})
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}