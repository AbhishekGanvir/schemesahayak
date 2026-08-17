import React, { useEffect, useState } from 'react';
import { getProfiles } from '../../services/api.js';

export default function ProfilePanel({ onSelectProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadProfiles = () => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    getProfiles({ signal: controller.signal })
      .then(setProfiles)
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  };

  useEffect(() => loadProfiles(), []);

  return (
    <div className="lg:col-span-4 bg-slate-50/50 p-5 flex flex-col justify-between border-t lg:border-t-0 border-slate-200">
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <i className="fa-solid fa-id-card text-blue-600"></i>
            Select a Profile
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Choose a profile to automatically prepare your scheme search.</p>
        </div>

        {loading && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-6">
            <p className="text-xs text-slate-500 mb-2">Unable to load profiles.</p>
            <button onClick={loadProfiles} className="text-xs font-semibold text-blue-600 hover:underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && profiles.length === 0 && <p className="text-xs text-slate-400 italic">No profiles available.</p>}

        {!loading && !error && profiles.length > 0 && (
          <div className="space-y-2">
            {profiles.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectProfile(item.title)}
                className="w-full  text-left p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-xl flex items-center justify-between transition-all group shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">{item.title}</div>
                    {item.desc && <div className="text-[10px] text-slate-500">{item.desc}</div>}
                  </div>
                </div>
                <span className="text-[11px] cursor-pointer text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  + Add
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
