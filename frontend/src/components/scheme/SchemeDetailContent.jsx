import React, { useState } from 'react';
import { isMeaningfulValue } from '../../utils/isMeaningfulValue.js';
import { documentLabel, applicationModeLabel, applicationStepLabel } from '../../utils/schemeFormatters.js';
import { translateText } from '../../services/api.js';

function Section({ icon, iconColor, title, children }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-2xs border border-slate-200">
      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
        <i className={`fa-solid ${icon} ${iconColor}`}></i> {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyNote({ children }) {
  return <p className="text-xs text-slate-400 italic">{children}</p>;
}

function formatEligibilityValue(value) {
  if (!isMeaningfulValue(value)) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value
      .map(formatEligibilityValue)
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'object') {
    // { minimum: 18, maximum: 60 }
    if (
      isMeaningfulValue(value.minimum) ||
      isMeaningfulValue(value.maximum)
    ) {
      if (
        isMeaningfulValue(value.minimum) &&
        isMeaningfulValue(value.maximum)
      ) {
        return `${value.minimum} – ${value.maximum}`;
      }

      if (isMeaningfulValue(value.minimum)) {
        return `Minimum ${value.minimum}`;
      }

      if (isMeaningfulValue(value.maximum)) {
        return `Maximum ${value.maximum}`;
      }
    }

    // Income object — only render an amount when one is actually set;
    // otherwise this scheme has no income-based restriction, so hide
    // the row entirely rather than showing a fabricated "₹ 0" or a
    // confusing "required: No".
    if ('maximum_annual_family_income' in value) {
      if (isMeaningfulValue(value.maximum_annual_family_income)) {
        const amount = Number(
          value.maximum_annual_family_income
        ).toLocaleString('en-IN');

        return `${value.currency || '₹'} ${amount} annual family income`;
      }

      if (value.required === true) {
        return 'Income limit applies (see official source for details)';
      }

      return null;
    }

    // Residency (and similar) shape — { required: true, state: 'India' }.
    // The "required" flag is just internal bookkeeping; what the user
    // actually wants to read is the place itself, e.g. "India", not
    // "required: Yes • state: India".
    if ('state' in value) {
      if (isMeaningfulValue(value.state)) {
        return String(value.state);
      }

      if (value.required === true) {
        return 'Required';
      }

      return null;
    }

    // Generic object fallback
    const entries = Object.entries(value).filter(([, v]) => isMeaningfulValue(v));

    if (entries.length === 0) {
      return null;
    }

    // Single-field objects (e.g. bank_account: { required: true }) read
    // more naturally as just the value, without an extra "required:" prefix.
    if (entries.length === 1) {
      return formatEligibilityValue(entries[0][1]);
    }

    return entries
      .map(
        ([key, v]) =>
          `${key.replace(/_/g, ' ')}: ${formatEligibilityValue(v)}`
      )
      .join(' • ');
  }

  return String(value);
}

function EligibilityRow({ label, value }) {
  const displayValue = formatEligibilityValue(value);

  if (!displayValue) return null;

  return (
    <div className="flex items-start gap-2 py-1.5">
      <i className="fa-solid fa-circle-check text-indigo-500 text-xs mt-0.5"></i>

      <span>
        <strong className="text-slate-800 font-semibold">
          {label}:
        </strong>{' '}

        <span className="text-slate-600">
          {displayValue}
        </span>
      </span>
    </div>
  );
}

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false);
  if (!isMeaningfulValue(faq?.question) && !isMeaningfulValue(faq?.answer)) return null;
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-3.5 text-left font-semibold text-xs sm:text-sm text-slate-800 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <span>{faq.question}</span>
        <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40 pt-3">
          {faq.answer}
        </div>
      )}
    </div>
  );
}

// Builds the payload sent to /api/gemini/translate for the Detail page.
// IMPORTANT: only human-readable text fields are included — scheme_id,
// URLs, numeric amounts, booleans, and verification data are
// deliberately left out so they are never translated or altered.
function buildTranslatablePayload(scheme) {
  const { identifiers, authority, benefit, description, eligibility, documents_required: documents, application, payment, faqs, tags } = scheme;

  return {
    language: 'en',
    scheme_name: scheme.scheme_name,
    scheme_name_local: scheme.scheme_name_local,
    summary: description.summary || description.short || description.full || '',
    identifiers: {
      category: identifiers.category,
      sub_category: identifiers.sub_category,
      target_group: identifiers.target_group,
      benefit_type: identifiers.benefit_type,
      scheme_type: identifiers.scheme_type,
      state: identifiers.state,
      sector: identifiers.sector
    },
    authority: {
      ministry_department: authority.ministry_department,
      government_level: authority.government_level,
      state: authority.state
    },
    benefit: {
      benefit_description: benefit.benefit_description
    },
    eligibility: {
      conditions: eligibility.conditions,
      exclusions: eligibility.exclusions
    },
    documents: documents.map(documentLabel).filter(Boolean),
    application: {
      mode: applicationModeLabel(application.mode),
      steps: application.steps.map(applicationStepLabel).filter(Boolean)
    },
    payment: {
      method: payment.method
    },
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    tags
  };
}

export default function SchemeDetailContent({ scheme, onAskAi }) {
  const {
    identifiers,
    authority,
    benefit,
    description,
    eligibility,
    documents_required: documentsRaw,
    application,
    payment,
    faqs,
    tags,
    source,
    verification,
    ai_advisor: aiAdvisor
  } = scheme;

  const documents = documentsRaw.map(documentLabel).filter(Boolean);
  const applicationSteps = application.steps.map(applicationStepLabel).filter(Boolean);
  const applicationMode = applicationModeLabel(application.mode);

  // ============================================================
  // TRANSLATE (Scheme Detail)
  // ============================================================
  const [translatedResult, setTranslatedResult] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(null);

  const handleTranslateDetail = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    if (translatedResult) {
      setShowTranslation(true);
      return;
    }

    setTranslating(true);
    setTranslateError(null);

    try {
      const payload = buildTranslatablePayload(scheme);

      const response = await translateText({
        result: payload,
        targetLanguage: 'hi'
      });

      if (response?.result && typeof response.result === 'object') {
        setTranslatedResult(response.result);
        setShowTranslation(true);
      } else {
        setTranslateError('Translation returned empty content.');
      }
    } catch (error) {
      setTranslateError(error?.message || 'Translation failed.');
    } finally {
      setTranslating(false);
    }
  };

  const t = showTranslation ? translatedResult : null;

  const fullDescription = description.full && description.full !== description.summary ? description.full : null;
  const activeSummary = (t && isMeaningfulValue(t.summary) && t.summary) || description.summary || description.short || fullDescription;
  const activeBenefitDescription = (t?.benefit && isMeaningfulValue(t.benefit.benefit_description) && t.benefit.benefit_description) || benefit.benefit_description;
  const activeConditions = t?.eligibility?.conditions?.length ? t.eligibility.conditions : eligibility.conditions;
  const activeExclusions = t?.eligibility?.exclusions?.length ? t.eligibility.exclusions : eligibility.exclusions;
  const activeDocuments = t?.documents?.length ? t.documents : documents;
  const activeApplicationSteps = t?.application?.steps?.length ? t.application.steps : applicationSteps;
  const activeApplicationMode = (t?.application && isMeaningfulValue(t.application.mode) && t.application.mode) || applicationMode;
  const activeFaqs = t?.faqs?.length ? t.faqs : faqs;

  const quickInfoItems = [
    { label: 'Ministry / Department', value: authority.ministry_department },
    { label: 'Government Level', value: authority.government_level },
    { label: 'Category', value: identifiers.category },
    { label: 'Sub-category', value: identifiers.sub_category },
    { label: 'State', value: identifiers.state },
    { label: 'Sector', value: identifiers.sector },
    { label: 'Target Group', value: identifiers.target_group },
    { label: 'Benefit Type', value: identifiers.benefit_type },
    { label: 'Scheme Type', value: identifiers.scheme_type }
  ].filter((item) => isMeaningfulValue(item.value));

  const paymentItems = [
    { label: 'Payment Method', value: payment.method },
    { label: 'DBT Enabled', value: payment.dbt === true ? 'Yes' : payment.dbt === false ? 'No' : payment.dbt },
    {
      label: 'Bank Account Required',
      value: payment.bank_account_required === true ? 'Yes' : payment.bank_account_required === false ? 'No' : payment.bank_account_required
    },
    { label: 'Aadhaar Linking Required', value: payment.aadhaar_linked === true ? 'Yes' : payment.aadhaar_linked === false ? 'No' : payment.aadhaar_linked }
  ].filter((item) => isMeaningfulValue(item.value));

  const hasEligibilityDetails =
    isMeaningfulValue(eligibility.age) ||
    isMeaningfulValue(eligibility.gender) ||
    isMeaningfulValue(eligibility.residency) ||
    isMeaningfulValue(eligibility.income) ||
    isMeaningfulValue(eligibility.bank_account);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-8">
        {/* Translate Bar */}
        <div className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">
            {showTranslation ? 'Showing Hindi translation of scheme details.' : 'View this scheme in Hindi.'}
          </span>
          <button
            type="button"
            onClick={handleTranslateDetail}
            disabled={translating}
            className="shrink-0 cursor-pointer px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <i className={`fa-solid ${translating ? 'fa-spinner fa-spin' : 'fa-language'}`}></i>
            {translating ? 'Translating…' : showTranslation ? 'Show Original' : 'Translate to Hindi'}
          </button>
        </div>
        {translateError && <p className="text-[11px] text-red-500 -mt-6">{translateError}</p>}

        {/* About This Scheme */}
        <Section icon="fa-circle-info" iconColor="text-blue-600" title="About This Scheme">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {activeSummary || 'No description available for this scheme yet.'}
          </p>
          {!t && fullDescription && description.summary && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3">{fullDescription}</p>
          )}
        </Section>

        {/* Key Benefits — heading always shown; falls back to an
            EmptyNote inside the card when there's no benefit data,
            unlike the other sections below which hide entirely. */}
        <Section icon="fa-gift" iconColor="text-emerald-600" title="Key Benefits">
          {isMeaningfulValue(activeBenefitDescription) || isMeaningfulValue(benefit.amount) ? (
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
              {isMeaningfulValue(activeBenefitDescription) && (
                <p className="font-medium text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  {activeBenefitDescription}
                </p>
              )}
              {isMeaningfulValue(benefit.amount) && (
                <p>
                  <strong className="text-slate-800">Amount:</strong> {benefit.currency || '₹'}
                  {benefit.amount}
                  {isMeaningfulValue(benefit.frequency) ? ` (${benefit.frequency})` : ''}
                </p>
              )}
              {isMeaningfulValue(benefit.annual_amount) && (
                <p>
                  <strong className="text-slate-800">Annual Amount:</strong> {benefit.currency || '₹'}
                  {benefit.annual_amount}
                </p>
              )}
            </div>
          ) : (
            <EmptyNote>No benefit details listed for this scheme yet.</EmptyNote>
          )}
        </Section>

        {/* Eligibility — hidden entirely (heading included) when there's
            no eligibility data, conditions, or exclusions to show. */}
        {(hasEligibilityDetails || activeConditions.length > 0 || activeExclusions.length > 0) && (
          <Section icon="fa-clipboard-check" iconColor="text-indigo-600" title="Eligibility Criteria">
            <div className="text-xs sm:text-sm">
              <EligibilityRow label="Age" value={eligibility.age} />
              <EligibilityRow label="Gender" value={eligibility.gender} />
              <EligibilityRow label="Residency" value={eligibility.residency} />
              <EligibilityRow label="Income" value={eligibility.income} />
              <EligibilityRow label="Bank Account" value={eligibility.bank_account} />

              {activeConditions.length > 0 && (
                <div className="mt-3">
                  <strong className="text-slate-800 font-semibold block mb-1.5">Additional Conditions:</strong>
                  <ul className="space-y-1.5">
                    {activeConditions.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600">
                        <i className="fa-solid fa-plus text-indigo-400 text-[10px] mt-1"></i>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeExclusions.length > 0 && (
                <div className="mt-3">
                  <strong className="text-slate-800 font-semibold block mb-1.5">Exclusions:</strong>
                  <ul className="space-y-1.5">
                    {activeExclusions.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600">
                        <i className="fa-solid fa-xmark text-red-400 text-[10px] mt-1"></i>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Required Documents — hide the entire section (heading
            included) when there are no real documents to list, rather
            than showing an empty "No specific documents listed." card. */}
        {activeDocuments.length > 0 && (
          <Section icon="fa-folder-open" iconColor="text-amber-600" title="Required Documents">
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
              {activeDocuments.map((doc, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* How to Apply — hidden entirely (heading included) when there's
            neither an application mode nor any steps to show. */}
        {(isMeaningfulValue(activeApplicationMode) || activeApplicationSteps.length > 0) && (
          <Section icon="fa-list-check" iconColor="text-teal-600" title="How to Apply">
            {isMeaningfulValue(activeApplicationMode) && (
              <p className="text-xs sm:text-sm text-slate-700 mb-3">
                <strong className="text-slate-800">Application Mode:</strong> {activeApplicationMode}
              </p>
            )}
            {activeApplicationSteps.length > 0 && (
              <ol className="space-y-3 text-xs sm:text-sm text-slate-700 list-decimal pl-4">
                {activeApplicationSteps.map((step, idx) => (
                  <li key={idx} className="pl-1 leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </Section>
        )}

        {/* Payment / DBT */}
        {paymentItems.length > 0 && (
          <Section icon="fa-money-bill-transfer" iconColor="text-cyan-600" title="Payment / DBT">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              {paymentItems.map((item) => (
                <div key={item.label}>
                  <span className="text-slate-500 block text-[11px]">{item.label}</span>
                  <strong className="text-slate-800 font-semibold">{item.value}</strong>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* FAQs */}
        {activeFaqs.length > 0 && (
          <Section icon="fa-circle-question" className="cursor-pointer" iconColor="text-purple-600" title="Frequently Asked Questions">
            <div className="space-y-2.5 ">
              {activeFaqs.map((faq, idx) => (
                <FaqItem key={idx} faq={faq} />
              ))}
            </div>
          </Section>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <Section icon="fa-tags" iconColor="text-slate-500" title="Tags">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        {/* Quick Info */}
        {quickInfoItems.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Info</h4>
            <div className="space-y-2.5 text-xs">
              {quickInfoItems.map((item) => (
                <div key={item.label}>
                  <span className="text-slate-500 block text-[11px]">{item.label}</span>
                  <strong className="text-slate-900 font-semibold">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Source */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Official Government Source</h4>
          <div className="space-y-3 text-xs">
            {isMeaningfulValue(source.source_type) && (
              <div>
                <span className="text-slate-500 block text-[11px]">Source Type:</span>
                <strong className="text-slate-900 font-semibold">{source.source_type}</strong>
              </div>
            )}
            <div>
              <span className="text-slate-500 block text-[11px]">Verified Portal URL:</span>
              {source.official_website ? (
                <a
                  href={source.official_website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline break-all"
                >
                  {source.official_website}
                </a>
              ) : (
                <span className="text-slate-400 italic">Not available</span>
              )}
            </div>
            {isMeaningfulValue(source.official_notification) && (
              <div>
                <span className="text-slate-500 block text-[11px]">Official Notification:</span>
                <a
                  href={source.official_notification}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline break-all"
                >
                  {source.official_notification}
                </a>
              </div>
            )}
            {isMeaningfulValue(source.source_reference) && (
              <div>
                <span className="text-slate-500 block text-[11px]">Reference:</span>
                <span className="text-slate-700">{source.source_reference}</span>
              </div>
            )}
            {isMeaningfulValue(source.last_verified) && (
              <div>
                <span className="text-slate-500 block text-[11px]">Last Verified:</span>
                <span className="text-slate-700">{source.last_verified}</span>
              </div>
            )}
          </div>
        </div>

        {/* Government Verification — shown for database schemes, and for
            any AI-generated scheme that has actually been verified.
            For AI-generated schemes still pending verification, the
            "verification pending" messaging lives in the AI Advisor
            block below instead of duplicating a second panel here. */}
        {(!aiAdvisor?.generated || verification.verified) && (
          <div
            className={`rounded-xl p-5 border shadow-2xs ${
              verification.verified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <h4
              className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                verification.verified ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              <i className={`fa-solid ${verification.verified ? 'fa-shield-check' : 'fa-triangle-exclamation'}`}></i>
              {verification.verified ? 'Government Verified' : 'Verification Pending'}
            </h4>
            {isMeaningfulValue(verification.verification_note) && (
              <p className="text-xs text-slate-700 leading-relaxed mb-2">{verification.verification_note}</p>
            )}
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Always verify details at the official source before applying or sharing personal documents.
            </p>
          </div>
        )}

        {/* AI Advisor Verification — only present for AI/Gemini-generated
            schemes. This is intentionally separate from, and never a
            substitute for, Government Verification above: a scheme can be
            "AI Advisor Verified" (structured/reviewed by Scheme Sahayak AI)
            while Government Verification remains Pending. For schemes
            still pending government verification, that caveat is folded
            into this block instead of showing a separate amber panel. */}
        {aiAdvisor && (isMeaningfulValue(aiAdvisor.status) || aiAdvisor.generated) && (
          <div className="rounded-xl p-5 border shadow-2xs bg-blue-50 border-blue-200">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-blue-700">
              <i className="fa-solid fa-robot"></i>
              {isMeaningfulValue(aiAdvisor.status) ? aiAdvisor.status : 'AI Advisor Verified'}
            </h4>
            {isMeaningfulValue(aiAdvisor.note) && (
              <p className="text-xs text-slate-700 leading-relaxed mb-2">{aiAdvisor.note}</p>
            )}
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {verification.verified
                ? 'This does not mean Government verification. Scheme Sahayak AI has reviewed and structured the scheme information.'
                : 'Not yet been independently verified against the official Government source. Please confirm the latest details there before applying or sharing personal documents.'}
            </p>
          </div>
        )}

        {/* Ask AI Box */}
        <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Have Questions About This Scheme?</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Get assistance with eligibility, required documents, and the application process.
          </p>
          <button
            onClick={onAskAi}
            className="w-full cursor-pointer py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow"
          >
            <i className="fa-solid fa-robot"></i> Ask Scheme Sahayak AI
          </button>
        </div>
      </div>
    </div>
  );
}
