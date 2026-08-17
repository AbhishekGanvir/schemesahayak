import React, { useEffect, useState } from 'react';
import { getSchemesCount } from '../../services/api.js';

export default function HeroSection({ navigateTo }) {
  const [schemeCount, setSchemeCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSchemesCount()
      .then((count) => {
        if (!cancelled) setSchemeCount(count);
      })
      .catch(() => {
        if (!cancelled) setSchemeCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-inner">
      <div className="max-w-5xl mx-auto text-left">
        <nav className="text-xs cursor-pointer font-medium text-blue-200 mb-3 flex items-center gap-2">
          <button onClick={() => navigateTo('home')} className="hover:underline hover:text-white">
            Home
          </button>
          <span>/</span>
          <span className="text-white">AI Scheme Assistant</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3">
          AI-Powered Government Scheme Advisor
        </h1>

        <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-4xl font-normal opacity-95">
         Discover government schemes relevant to your needs, eligibility, and circumstances. Ask a question, use voice search, or select a profile to find relevant schemes.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              const chatSec = document.getElementById('chat-section');
              if (chatSec) chatSec.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-white cursor-pointer text-blue-900 font-bold text-xs rounded-lg hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2 transform active:scale-95"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-red-500"></i> Ask Scheme Sahayak
          </button>
          <button
            onClick={() => navigateTo('search')}
            className="px-4 cursor-pointer py-2 bg-blue-800/80 hover:bg-blue-800 text-white border border-blue-500/50 font-bold text-xs rounded-lg transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-magnifying-glass"></i> Explore Government Schemes
          </button>
        </div>
      </div>
    </section>
  );
}
