import React, { useEffect, useRef, useState } from 'react';
import SectorChips from '../components/search/SectorChips.jsx';
import SchemeGridCard from '../components/search/SchemeGridCard.jsx';
import { getCategories, getSchemes, getSchemesByCategory, searchSchemes } from '../services/api.js';

const ALL_CATEGORY = { key: 'ALL', title: 'All Sectors', icon: '✨' };
const DEBOUNCE_MS = 350;
const PAGE_SIZE = 20;

export default function SearchDirectory({ navigateTo, openSchemeDetail, onAskAi }) {
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [selectedSectorCategory, setSelectedSectorCategory] = useState('ALL');

  const [categories, setCategories] = useState([ALL_CATEGORY]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // `schemes` always holds the FULL result set for the current
  // query/category combination. `visibleCount` controls how many of
  // those are actually rendered, and is what "Load 20 More" bumps up.
  const [schemes, setSchemes] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(null);
  const [schemesLoading, setSchemesLoading] = useState(true);
  const [schemesError, setSchemesError] = useState(false);

  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);

  // Load categories once.
  useEffect(() => {
    const controller = new AbortController();
    setCategoriesLoading(true);
    getCategories({ signal: controller.signal })
      .then((cats) => setCategories([ALL_CATEGORY, ...cats]))
      .catch((err) => {
        if (err.name !== 'AbortError') setCategories([ALL_CATEGORY]);
      })
      .finally(() => setCategoriesLoading(false));
    return () => controller.abort();
  }, []);

  const dedupeById = (items) => {
    const seen = new Set();
    const result = [];
    for (const item of items) {
      const key = item?.id;
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      result.push(item);
    }
    return result;
  };

  const fetchSchemes = (query, category) => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setSchemesLoading(true);
    setSchemesError(false);

    const request = query.trim()
      ? searchSchemes(query.trim(), { signal: controller.signal })
      : category !== 'ALL'
      ? getSchemesByCategory(category, { signal: controller.signal })
      : getSchemes({ signal: controller.signal });

    request
      .then(({ items, count }) => {
        // Stale-request protection: ignore this response if a newer
        // request has since been issued.
        if (requestId !== requestIdRef.current) return;
        const deduped = dedupeById(items);
        setSchemes(deduped);
        // Reset back to the first page of results whenever the
        // search/filter changes (new query or new category).
        setVisibleCount(PAGE_SIZE);
        if (!query.trim() && category === 'ALL') setTotalCount(count);
      })
      .catch((err) => {
        if (err.name === 'AbortError' || requestId !== requestIdRef.current) return;
        setSchemesError(true);
        setSchemes([]);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setSchemesLoading(false);
      });

    return () => controller.abort();
  };

  // Debounced fetch whenever the query or category changes.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSchemes(directoryQuery, selectedSectorCategory);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directoryQuery, selectedSectorCategory]);

  const resetFilters = () => {
    setDirectoryQuery('');
    setSelectedSectorCategory('ALL');
  };

  const visibleSchemes = schemes.slice(0, visibleCount);
  const hasMore = visibleCount < schemes.length;
  const isSearching = Boolean(directoryQuery.trim());

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, schemes.length));
  };

  const handleAskAi = () => {
    if (typeof onAskAi === 'function') {
      onAskAi(directoryQuery.trim());
    }
  };

  return (
    <div className="view-section">
      <section className="bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 text-white py-10 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-5xl mx-auto">
          <nav className="text-xs font-medium text-blue-200 mb-3 flex items-center gap-2">
            <button onClick={() => navigateTo('home')} className="hover:underline hover:text-white">
              Home
            </button>
            <span>/</span>
            <span className="text-white">Scheme Directory</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">Explore Government Schemes</h1>
          <p className="text-blue-100 text-xs sm:text-sm max-w-2xl opacity-90">
            Search and explore government schemes by keyword, category, or area of support.
          </p>

          <div className="mt-6 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 max-w-3xl">
            <div className="relative">
              <input
                type="text"
                value={directoryQuery}
                onChange={(e) => setDirectoryQuery(e.target.value)}
                placeholder="Search schemes (e.g. Kisan, Scholarship, Housing)..."
                className="w-full pl-11 pr-4 py-3 bg-white text-slate-900 rounded-xl text-xs sm:text-sm font-medium shadow-md outline-none focus:ring-2 focus:ring-blue-500"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400 text-sm"></i>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectorChips
          categories={categories}
          categoriesLoading={categoriesLoading}
          selectedSectorCategory={selectedSectorCategory}
          onSelect={setSelectedSectorCategory}
        />

        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-600">
            {schemesLoading
              ? 'Searching…'
              : schemes.length > 0
              ? `Showing ${visibleSchemes.length} of ${schemes.length} schemes`
              : 'No schemes found'}
          </span>
          <button onClick={resetFilters} className="text-xs cursor-pointer text-blue-600 font-semibold hover:underline">
            Reset Filters
          </button>
        </div>

        {schemesLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        )}

        {!schemesLoading && schemesError && (
          <div className="text-center py-16">
            <p className="text-sm font-semibold text-slate-700 mb-3">Unable to load schemes. Please try again.</p>
            <button
              onClick={() => fetchSchemes(directoryQuery, selectedSectorCategory)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!schemesLoading && !schemesError && schemes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm font-semibold text-slate-700">
              {isSearching
                ? 'No matching scheme was found. For a better result, try asking the AI assistant.'
                : 'No schemes found.'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Try a different keyword or reset the filters.</p>
            {isSearching && (
              <button
                onClick={handleAskAi}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <i className="fa-solid fa-robot"></i> Ask AI
              </button>
            )}
          </div>
        )}

        {!schemesLoading && !schemesError && schemes.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleSchemes.map((scheme) => (
                <SchemeGridCard key={scheme.id} scheme={scheme} onViewDetails={openSchemeDetail} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                >
                  Load 20 More
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
