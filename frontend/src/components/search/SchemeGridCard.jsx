import React from 'react';

export default function SchemeGridCard({ scheme, onViewDetails }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-400 shadow-sm transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-2xl p-2 bg-slate-50 rounded-lg border border-slate-100">{scheme.icon}</span>
          <div>
            {scheme.governmentLevel && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                {scheme.governmentLevel}
              </span>
            )}
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-0.5">
              {scheme.name}
            </h3>
          </div>
        </div>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed line-clamp-2">
          {scheme.summary || 'No description available yet.'}
        </p>
      </div>
      <div className="pt-3  border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={() => onViewDetails(scheme.id)}
          className="px-3.5 cursor-pointer py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 transition-colors"
        >
          View Details
        </button>
        {scheme.applicationUrl ? (
          <a
            href={scheme.applicationUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
          >
            Apply ↗
          </a>
        ) : (
          <span className="px-3.5 py-1.5 text-slate-300 text-xs font-semibold">Link unavailable</span>
        )}
      </div>
    </div>
  );
}
