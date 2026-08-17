import React, {useRef} from 'react';
import SchemeDetailContent from '../components/scheme/SchemeDetailContent.jsx';
import { downloadSchemePdf } from '../utils/pdfGenerator';

function SchemeDetailSkeleton({ navigateTo }) {
  return (
    <div className="view-section">
      <section className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8 shadow-inner border-b border-slate-800">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-3 w-40 bg-slate-700/60 rounded mb-6" />
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-700/60 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-32 bg-slate-700/60 rounded" />
              <div className="h-6 w-2/3 bg-slate-700/60 rounded" />
              <div className="h-3 w-full max-w-lg bg-slate-700/60 rounded" />
            </div>
          </div>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigateTo('home')}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs mb-6"
        >
          <i className="fa-solid fa-arrow-left"></i> Back to Home
        </button>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-white rounded-xl border border-slate-200" />
          <div className="h-32 bg-white rounded-xl border border-slate-200" />
          <div className="h-32 bg-white rounded-xl border border-slate-200" />
        </div>
      </section>
    </div>
  );
}

function SchemeDetailError({ error, navigateTo, onRetry }) {
  const notFound = error === 'not-found';
  return (
    <div className="view-section">
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mb-4">
          <i className={`fa-solid ${notFound ? 'fa-magnifying-glass' : 'fa-triangle-exclamation'}`}></i>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {notFound ? 'Scheme not found.' : 'Unable to load this scheme. Please try again.'}
        </h2>
        <div className="flex items-center justify-center gap-3 mt-5">
          {!notFound && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => navigateTo('search')}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
          >
            Browse Directory
          </button>
        </div>
      </section>
    </div>
  );
}

export default function SchemeDetail({ scheme, loading, error, onRetry, navigateTo, showToast, onAskAi }) {
  const pdfPrintContainerRef = useRef(null);
  if (loading) return <SchemeDetailSkeleton navigateTo={navigateTo} />;
  if (error || !scheme) return <SchemeDetailError error={error || 'not-found'} navigateTo={navigateTo} onRetry={onRetry} />;

  const { identifiers, status, authority, benefit, description, source } = scheme;
  const summary = description.summary || description.short || description.full || 'No description available for this scheme yet.';
  const applicationUrl = source.official_website;

  return (
    <div className="view-section">
      
      

      <section className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8 shadow-inner border-b border-slate-800">
        <div className="max-w-5xl mx-auto">
          <nav className="text-xs font-medium text-slate-300 mb-4 flex items-center gap-2 flex-wrap">
            <button onClick={() => navigateTo('home')} className="hover:underline hover:text-white">
              Home
            </button>
            <span>/</span>
            <button onClick={() => navigateTo('search')} className="hover:underline hover:text-white">
              Directory
            </button>
            <span>/</span>
            <span className="text-blue-300 font-semibold truncate max-w-xs">{scheme.scheme_name}</span>
          </nav>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center text-3xl shrink-0 shadow-inner">
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                {authority.government_level && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {authority.government_level}
                  </span>
                )}
                {identifiers.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-200 border border-slate-400/30">
                    {identifiers.category}
                  </span>
                )}
                {identifiers.state && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-200 border border-slate-400/30">
                    {identifiers.state}
                  </span>
                )}
                {status.status_label && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      status.active === false
                        ? 'bg-red-500/20 text-red-300 border-red-400/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    }`}
                  >
                    {status.status_label}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">{scheme.scheme_name}</h1>
              {scheme.scheme_name_local && <p className="text-slate-400 text-xs sm:text-sm mb-2">{scheme.scheme_name_local}</p>}
              {authority.ministry_department && (
                <p className="text-slate-400 text-[11px] sm:text-xs mb-2">{authority.ministry_department}</p>
              )}
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl">{summary}</p>
              {(benefit.benefit_description || benefit.amount) && (
                <p className="text-blue-200 text-xs sm:text-sm leading-relaxed max-w-3xl mt-2 font-medium">
                  {benefit.benefit_description || `${benefit.currency || '₹'}${benefit.amount}${benefit.frequency ? ` / ${benefit.frequency}` : ''}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

       {/* PDF PRINT CONTAINER */}
<div
  ref={pdfPrintContainerRef}
  style={{
    position: 'fixed',
    left: '0',
    top: '0',
    width: '750px',
    background: '#ffffff',
    color: '#0f172a',
    zIndex: '999999',
    pointerEvents: 'none'
  }}
/>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Home
          </button>
        </div>

        {/* Action Header Bar */}
        <div className="bg-white rounded-xl p-5 mb-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Take Action on this Scheme</h3>
            <p className="text-xs text-slate-500 mt-0.5">Apply directly on the official portal or download a printable PDF summary.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {applicationUrl ? (
              <a
                href={applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Apply on Official Portal</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </a>
            ) : (
              <span className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl font-semibold text-xs text-center">
                Official link unavailable
              </span>
            )}

            <button
              onClick={() =>
           downloadSchemePdf(
           scheme,
           pdfPrintContainerRef,
          showToast
          )
          }
              className="w-full sm:w-auto cursor-pointer px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-slate-700"
            >
              <i className="fa-solid fa-file-pdf text-red-400"></i> Download Scheme Details
            </button>
          </div>
        </div>

        <SchemeDetailContent scheme={scheme} onAskAi={onAskAi} />
      </section>
    </div>
  );
}
