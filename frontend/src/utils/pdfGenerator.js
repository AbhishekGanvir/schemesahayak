// =====================================================================
// SCHEME PDF GENERATOR
// =====================================================================
//
// Uses the browser's native print pipeline ("Save as PDF" in the
// print dialog) instead of html2pdf.js / html2canvas.
//
// Why: html2canvas rasterizes the DOM to a bitmap before jsPDF lays
// it onto a page. That step is where most of the real-world failures
// come from — blank output on some mobile WebViews, broken/garbled
// text (because it's actually an image, not text), inline SVG not
// rendering, CORS issues with fonts, huge memory spikes on long
// pages, and inconsistent scaling across devices/DPI settings.
//
// The print approach sidesteps all of that: we build the exact same
// HTML, drop it into a hidden iframe with print-specific CSS, and
// call the browser's own print() — which every desktop and mobile
// browser already knows how to paginate and rasterize correctly
// (or, on desktop, just emit a real vector/text PDF directly via
// "Save as PDF"). No extra library, no canvas, no memory spikes.
//
// Mirrors the display logic in SchemeDetailContent.jsx so the PDF and
// the on-screen detail page never disagree: same isMeaningfulValue
// placeholder filtering, same eligibility formatting (age ranges,
// income, residency/state), same documents/steps formatters, same
// Payment/DBT fields, same Government Verified / AI Advisor
// verification panels, and the same "hide the whole section, heading
// included, when there's nothing real to show" rule — except Key
// Benefit, which (like on the detail page) always shows its heading
// with a fallback line.
//
// =====================================================================

import { isMeaningfulValue } from "./isMeaningfulValue.js";
import {
  documentLabel,
  applicationModeLabel,
  applicationStepLabel,
} from "./schemeFormatters.js";

// =====================================================================
// BRAND LOGO (inline SVG — matches the mark used on the site header)
// =====================================================================

const SCHEME_SAHAYAK_LOGO_SVG = `
<svg width="42" height="42" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B1F3A"/>
      <stop offset="55%" stop-color="#123B7A"/>
      <stop offset="100%" stop-color="#2154C7"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#EDF1F8"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="240" height="240" rx="52" fill="url(#bgGrad)"/>
  <g>
    <path d="M120,32
             C155,32 188,43 203,58
             L203,120
             C203,175 167,208 120,224
             C73,208 37,175 37,120
             L37,58
             C52,43 85,32 120,32 Z"
          fill="url(#shieldGrad)" stroke="#0B1F3A" stroke-width="2"/>
  </g>
  <g fill="#0B1F3A">
    <path d="M120,76 L158,106 L82,106 Z"/>
    <rect x="82" y="106" width="76" height="9" rx="1.5"/>
    <rect x="88" y="119" width="9" height="52" rx="1.5"/>
    <rect x="107" y="119" width="9" height="52" rx="1.5"/>
    <rect x="125" y="119" width="9" height="52" rx="1.5"/>
    <rect x="143" y="119" width="9" height="52" rx="1.5"/>
  </g>
  <rect x="76" y="175" width="88" height="6" fill="#FF9933"/>
  <rect x="76" y="181" width="88" height="6" fill="#FFFFFF" stroke="#D9DEE8" stroke-width="0.5"/>
  <rect x="76" y="187" width="88" height="6" fill="#128807"/>
  <g fill="#FFB13C">
    <path d="M184,46
             C185.5,54 190,58.5 198,60
             C190,61.5 185.5,66 184,74
             C182.5,66 178,61.5 170,60
             C178,58.5 182.5,54 184,46 Z"/>
  </g>
</svg>
`;

// =====================================================================
// HTML ESCAPE
// =====================================================================

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =====================================================================
// FORMAT ELIGIBILITY VALUE
// =====================================================================
//
// Same rules as formatEligibilityValue() in SchemeDetailContent.jsx:
//   - hides anything that isn't isMeaningfulValue (so backend
//     placeholders like "Not specified" / "Not applicable" never
//     leak into the PDF)
//   - { minimum, maximum } → "18 – 60" / "Minimum 18" / "Maximum 60"
//   - income shape with maximum_annual_family_income → a plain
//     amount sentence, or null when there's no real limit
//   - residency (and similar) shape { required, state } → just the
//     state, e.g. "India" — not "required: Yes • state: India"
//   - single-field objects (e.g. { required: true }) → just that
//     value ("Yes"/"No"), not "required: Yes"
//   - plain strings/numbers/booleans (e.g. Payment/DBT fields) pass
//     straight through — "Yes"/"No" for booleans
//   - otherwise a generic "key: value • key: value" of only the
//     meaningful entries
//
// =====================================================================

function formatEligibilityValuePdf(value) {
  if (!isMeaningfulValue(value)) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    const parts = value.map(formatEligibilityValuePdf).filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }

  if (typeof value === "object") {
    // { minimum: 18, maximum: 60 }
    if (isMeaningfulValue(value.minimum) || isMeaningfulValue(value.maximum)) {
      if (isMeaningfulValue(value.minimum) && isMeaningfulValue(value.maximum)) {
        return `${value.minimum} – ${value.maximum}`;
      }
      if (isMeaningfulValue(value.minimum)) {
        return `Minimum ${value.minimum}`;
      }
      if (isMeaningfulValue(value.maximum)) {
        return `Maximum ${value.maximum}`;
      }
    }

    // Income object — only render an amount when one is actually set.
    if ("maximum_annual_family_income" in value) {
      if (isMeaningfulValue(value.maximum_annual_family_income)) {
        const amount = Number(value.maximum_annual_family_income).toLocaleString("en-IN");
        return `${value.currency || "₹"} ${amount} annual family income`;
      }
      if (value.required === true) {
        return "Income limit applies (see official source for details)";
      }
      return null;
    }

    // Residency (and similar) shape — { required: true, state: 'India' }.
    if ("state" in value) {
      if (isMeaningfulValue(value.state)) {
        return String(value.state);
      }
      if (value.required === true) {
        return "Required";
      }
      return null;
    }

    // Generic object fallback
    const entries = Object.entries(value).filter(([, v]) => isMeaningfulValue(v));

    if (entries.length === 0) {
      return null;
    }

    if (entries.length === 1) {
      return formatEligibilityValuePdf(entries[0][1]);
    }

    return entries
      .map(([key, v]) => `${key.replace(/_/g, " ")}: ${formatEligibilityValuePdf(v)}`)
      .join(" • ");
  }

  return String(value);
}

// =====================================================================
// BUILD PDF HTML (the scheme "content" — no <html>/<head> wrapper,
// this gets dropped straight into the print document below)
// =====================================================================

export function buildSchemePdfHtml(scheme) {
  if (!scheme) {
    return "";
  }

  const {
    identifiers = {},
    status = {},
    authority = {},
    benefit = {},
    description = {},
    eligibility = {},
    documents_required = [],
    application = {},
    payment = {},
    verification = {},
    ai_advisor: aiAdvisor = {},
    source = {},
  } = scheme;

  const summary =
    (isMeaningfulValue(description.summary) && description.summary) ||
    (isMeaningfulValue(description.short) && description.short) ||
    (isMeaningfulValue(description.full) && description.full) ||
    "No description available.";

  // Key Benefit keeps a visible heading with a fallback line even
  // when empty — mirrored from SchemeDetailContent.jsx.
  const benefitText = isMeaningfulValue(benefit.benefit_description)
    ? benefit.benefit_description
    : isMeaningfulValue(benefit.amount)
    ? `${benefit.currency || "₹"}${benefit.amount}${
        isMeaningfulValue(benefit.frequency) ? ` (${benefit.frequency})` : ""
      }`
    : "No benefit details listed for this scheme yet.";

  const eligibilityLines = [
    ["Age", eligibility.age],
    ["Gender", eligibility.gender],
    ["Residency", eligibility.residency],
    ["Income", eligibility.income],
    ["Bank Account", eligibility.bank_account],
  ]
    .map(([label, value]) => {
      const formatted = formatEligibilityValuePdf(value);
      return formatted ? `${label}: ${formatted}` : null;
    })
    .filter(Boolean);

  const conditionLines = (Array.isArray(eligibility.conditions) ? eligibility.conditions : [])
    .filter((c) => isMeaningfulValue(c))
    .map((condition) => `Condition: ${formatEligibilityValuePdf(condition)}`);

  const allEligibilityLines = [...eligibilityLines, ...conditionLines];

  const documents = (Array.isArray(documents_required) ? documents_required : [])
    .map(documentLabel)
    .filter(Boolean);

  const applicationMode = applicationModeLabel(application.mode);

  const steps = (Array.isArray(application.steps) ? application.steps : [])
    .map(applicationStepLabel)
    .filter(Boolean);

  const hasHowToApply = isMeaningfulValue(applicationMode) || steps.length > 0;

  // Payment / DBT — same fields and Yes/No formatting as the
  // paymentItems block on the detail page.
  const paymentLines = [
    ["Payment Method", payment.method],
    ["DBT Enabled", payment.dbt],
    ["Bank Account Required", payment.bank_account_required],
    ["Aadhaar Linking Required", payment.aadhaar_linked],
  ]
    .map(([label, value]) => {
      const formatted = formatEligibilityValuePdf(value);
      return formatted ? `${label}: ${formatted}` : null;
    })
    .filter(Boolean);

  // Verification — shows exactly ONE panel, never both and never a
  // "pending" state: Government Verified when the scheme is actually
  // verified, otherwise AI Advisor Verified when this is an
  // AI/Gemini-generated scheme, otherwise nothing (no section at all).
  const showGovVerification = verification.verified === true;
  const showAiAdvisor =
    !showGovVerification &&
    !!aiAdvisor &&
    (isMeaningfulValue(aiAdvisor.status) || aiAdvisor.generated);
  const hasVerificationSection = showGovVerification || showAiAdvisor;

  const govVerificationHtml = showGovVerification
    ? `
      <div
        style="
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 8px;
          padding: 9px 12px;
        "
      >
        <div style="font-size: 10.5px; font-weight: 700; color: #047857; margin-bottom: 3px;">
          ✅ GOVERNMENT VERIFIED
        </div>
        ${
          isMeaningfulValue(verification.verification_note)
            ? `<p style="font-size: 10.5px; color: #334155; margin: 0 0 3px;">${escapeHtml(
                verification.verification_note
              )}</p>`
            : ""
        }
        <p style="font-size: 9px; color: #64748b; margin: 0;">
          Always verify details at the official source before applying or sharing personal documents.
        </p>
      </div>
    `
    : "";

  const aiAdvisorHtml = showAiAdvisor
    ? `
      <div
        style="
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 9px 12px;
        "
      >
        <div style="font-size: 10.5px; font-weight: 700; color: #1d4ed8; margin-bottom: 3px;">
          🤖 ${escapeHtml(
            isMeaningfulValue(aiAdvisor.status) ? aiAdvisor.status : "AI Advisor Verified"
          )}
        </div>
        ${
          isMeaningfulValue(aiAdvisor.note)
            ? `<p style="font-size: 10.5px; color: #334155; margin: 0 0 3px;">${escapeHtml(
                aiAdvisor.note
              )}</p>`
            : ""
        }
        <p style="font-size: 9px; color: #64748b; margin: 0;">
          Not independently verified against government records. Please confirm the details through the relevant official government source before applying or sharing personal documents.
        </p>
      </div>
    `
    : "";

  // Header badges — mirrors the pill badges shown under the title on
  // the live detail page (government level, category, state, status).
  const badges = [
    isMeaningfulValue(authority.government_level) && {
      text: authority.government_level,
      bg: "rgba(59,130,246,0.18)",
      color: "#93c5fd",
      border: "rgba(96,165,250,0.35)",
    },
    isMeaningfulValue(identifiers.category) && {
      text: identifiers.category,
      bg: "rgba(148,163,184,0.18)",
      color: "#e2e8f0",
      border: "rgba(148,163,184,0.35)",
    },
    isMeaningfulValue(identifiers.state) && {
      text: identifiers.state,
      bg: "rgba(148,163,184,0.18)",
      color: "#e2e8f0",
      border: "rgba(148,163,184,0.35)",
    },
    isMeaningfulValue(status.status_label) && {
      text: status.status_label,
      bg: status.active === false ? "rgba(248,113,113,0.18)" : "rgba(52,211,153,0.18)",
      color: status.active === false ? "#fca5a5" : "#6ee7b7",
      border: status.active === false ? "rgba(248,113,113,0.35)" : "rgba(52,211,153,0.35)",
    },
  ].filter(Boolean);

  const badgesHtml = badges
    .map(
      (b) => `
        <span
          style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 700;
            line-height: 1;
            padding: 5px 10px 4px;
            border-radius: 999px;
            margin: 0 6px 6px 0;
            background: ${b.bg};
            color: ${b.color};
            border: 1px solid ${b.border};
          "
        >${escapeHtml(b.text)}</span>
      `
    )
    .join("");

  // Section header helper — icon + title + underline, matching the
  // Section component's look on the detail page.
  const sectionHeader = (icon, color, title) => `
    <div
      style="
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11.5px;
        font-weight: 700;
        color: #0f172a;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 5px;
        margin-bottom: 7px;
      "
    >
      <span style="font-size: 12px;">${icon}</span>
      <span style="color: ${color}; letter-spacing: 0.02em;">${title}</span>
    </div>
  `;

  // break-inside is the modern print/paginated-media property;
  // page-break-inside is kept alongside it for older WebKit engines
  // (older Safari / some Android WebViews) that don't honor break-inside.
  const cardStyle = `
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  `;

  return `
    <div
      style="
        width: 100%;
        max-width: 740px;
        box-sizing: border-box;
        background: #ffffff;
        color: #1e293b;
        font-family: Arial, Helvetica, sans-serif;
        padding: 22px 26px;
        line-height: 1.4;
        font-size: 12px;
        margin: 0 auto;
      "
    >

      <!-- Brand header -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <div style="flex-shrink: 0; line-height: 0;">${SCHEME_SAHAYAK_LOGO_SVG}</div>
        <div>
          <div style="font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
            Scheme <span style="color: #2563eb;">Sahayak</span>
          </div>
          <div style="font-size: 8.5px; font-weight: 700; letter-spacing: 0.09em; color: #94a3b8; text-transform: uppercase; margin-top: 1px;">
            Your Guide to Government Schemes
          </div>
        </div>
      </div>

      <!-- Tricolor accent bar -->
      <div style="display: flex; height: 3px; border-radius: 2px; overflow: hidden; margin-bottom: 6px;">
        <div style="flex: 1; background: #f97316;"></div>
        <div style="flex: 1; background: #e2e8f0;"></div>
        <div style="flex: 1; background: #16a34a;"></div>
      </div>

      <p style="font-size: 9.5px; color: #94a3b8; margin: 0 0 12px;">
        Government Scheme Reference Sheet
        • Generated ${escapeHtml(new Date().toLocaleDateString("en-IN"))}
      </p>

      <!-- Hero card -->
      <div
        style="
          background: linear-gradient(135deg, #0f172a, #1e3a8a);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 12px;
          break-inside: avoid;
          page-break-inside: avoid;
        "
      >
        ${badgesHtml ? `<div style="margin-bottom: 8px;">${badgesHtml}</div>` : ""}

        <h2 style="font-size: 19px; font-weight: 800; color: #ffffff; margin: 0 0 5px; letter-spacing: -0.01em;">
          ${escapeHtml(scheme.scheme_name || "Unnamed Scheme")}
        </h2>

        ${
          isMeaningfulValue(scheme.scheme_name_local)
            ? `<p style="font-size: 10px; color: #94a3b8; margin: 0 0 6px;">${escapeHtml(
                scheme.scheme_name_local
              )}</p>`
            : ""
        }

        ${
          isMeaningfulValue(authority.ministry_department)
            ? `<p style="font-size: 9.5px; color: #93c5fd; margin: 0 0 8px;">${escapeHtml(
                authority.ministry_department
              )}</p>`
            : ""
        }

        <p style="font-size: 11px; color: #cbd5e1; margin: 0; max-width: 600px;">
          ${escapeHtml(summary)}
        </p>
      </div>

      <!-- Key Benefit -->
      <div style="${cardStyle}">
        ${sectionHeader("💰", "#059669", "KEY BENEFIT")}
        <div
          style="
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            padding: 9px 12px;
            border-radius: 8px;
            color: #065f46;
            font-size: 11px;
            font-weight: 600;
          "
        >
          ${escapeHtml(benefitText)}
        </div>
      </div>

      ${
        allEligibilityLines.length
          ? `
            <div style="${cardStyle}">
              ${sectionHeader("✅", "#4f46e5", "ELIGIBILITY CRITERIA")}
              <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #334155;">
                ${allEligibilityLines
                  .map(
                    (line) => `
                      <li style="margin-bottom: 3px;">${escapeHtml(line)}</li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }

      ${
        documents.length
          ? `
            <div style="${cardStyle}">
              ${sectionHeader("📄", "#b45309", "REQUIRED DOCUMENTS")}
              <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #334155;">
                ${documents
                  .map(
                    (doc) => `
                      <li style="margin-bottom: 3px;">${escapeHtml(doc)}</li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }

      ${
        hasHowToApply
          ? `
            <div style="${cardStyle}">
              ${sectionHeader("📝", "#0d9488", "HOW TO APPLY")}

              ${
                isMeaningfulValue(applicationMode)
                  ? `
                    <p style="font-size: 11px; margin: 0 0 8px; color: #334155;">
                      <strong style="color: #0f172a;">Application Mode:</strong> ${escapeHtml(
                        applicationMode
                      )}
                    </p>
                  `
                  : ""
              }

              ${
                steps.length
                  ? `
                    <ol style="margin: 0; padding-left: 18px; font-size: 11px; color: #334155;">
                      ${steps
                        .map(
                          (step) => `
                            <li style="margin-bottom: 4px;">${escapeHtml(step)}</li>
                          `
                        )
                        .join("")}
                    </ol>
                  `
                  : ""
              }
            </div>
          `
          : ""
      }

      ${
        paymentLines.length
          ? `
            <div style="${cardStyle}">
              ${sectionHeader("💳", "#0891b2", "PAYMENT / DBT")}
              <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #334155;">
                ${paymentLines
                  .map(
                    (line) => `
                      <li style="margin-bottom: 3px;">${escapeHtml(line)}</li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }

      ${
        hasVerificationSection
          ? `
            <div style="${cardStyle}">
              ${sectionHeader("🛡️", "#1d4ed8", "VERIFICATION STATUS")}
              ${govVerificationHtml}
              ${aiAdvisorHtml}
            </div>
          `
          : ""
      }

      <!-- Meta card -->
      <div
        style="
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 10px;
          border: 1px solid #e2e8f0;
          color: #334155;
          margin-bottom: 4px;
          break-inside: avoid;
          page-break-inside: avoid;
        "
      >
        <strong style="color: #0f172a;">Ministry / Department:</strong>
        ${escapeHtml(
          isMeaningfulValue(authority.ministry_department)
            ? authority.ministry_department
            : "Not specified"
        )}

        <br />

        <strong style="color: #0f172a;">Category:</strong>
        ${escapeHtml(
          isMeaningfulValue(identifiers.category) ? identifiers.category : "Not specified"
        )}

        ${
          source.official_website
            ? `
              <br />
              <strong style="color: #0f172a;">Official Portal:</strong>
              ${escapeHtml(source.official_website)}
            `
            : ""
        }
      </div>

      <div
        style="
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
          color: #94a3b8;
          font-size: 9px;
        "
      >
        Scheme Sahayak provides this reference for informational
        purposes. Always verify eligibility, documents and application
        details on the official government portal before applying.
      </div>

    </div>
  `;
}

// =====================================================================
// BUILD FULL PRINT DOCUMENT
// =====================================================================
//
// Wraps buildSchemePdfHtml()'s content fragment in a full HTML
// document with @page rules so the browser's print engine paginates
// it exactly like a real PDF: letter size, 0.3in margins, cards that
// never split mid-card across a page break, and colors that survive
// "print backgrounds" being off by default (print-color-adjust).
//
// =====================================================================

function buildSchemePrintDocument(scheme) {
  const contentHtml = buildSchemePdfHtml(scheme);
  const title = `${scheme?.scheme_name || "Scheme"} - Scheme Sahayak`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page {
    size: letter;
    margin: 0.3in;
  }

  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
  }

  body {
    display: flex;
    justify-content: center;
  }

  img, svg {
    max-width: 100%;
  }

  @media print {
    body {
      width: auto;
    }
  }
</style>
</head>
<body>
${contentHtml}
</body>
</html>`;
}

// =====================================================================
// DOWNLOAD / PRINT PDF
// =====================================================================
//
// pdfPrintContainerRef is accepted for backward compatibility with
// existing call sites but is no longer required — the print approach
// builds its own isolated iframe document instead of reusing a node
// in the live page, so nothing needs to be rendered on-screen first.
//
// =====================================================================

export async function downloadSchemePdf(scheme, pdfPrintContainerRef, showToast) {
  if (!scheme) {
    return;
  }

  showToast?.("📄 Preparing PDF...");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener("focus", onFocusAfterPrint);
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  // Different browsers signal "the print dialog is done" differently.
  // Desktop Chrome/Edge/Firefox fire `afterprint` on the iframe's own
  // window. Safari and some mobile browsers don't reliably fire it on
  // iframes, but focus always returns to the main window once the
  // native print/share sheet closes — so that's used as a fallback
  // signal. A final timeout guarantees the iframe never lingers even
  // if neither event fires.
  function onFocusAfterPrint() {
    setTimeout(cleanup, 500);
  }

  try {
    document.body.appendChild(iframe);
    window.addEventListener("focus", onFocusAfterPrint, { once: true });

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(buildSchemePrintDocument(scheme));
    doc.close();

    // Wait for the iframe to actually finish loading/laying out
    // (fonts, inline SVG, reflow) before invoking print — calling
    // print() too early can produce a blank or half-rendered page.
    await new Promise((resolve) => {
      if (doc.readyState === "complete") {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      } else {
        iframe.contentWindow.addEventListener(
          "load",
          () => requestAnimationFrame(() => requestAnimationFrame(resolve)),
          { once: true }
        );
      }
    });

    iframe.contentWindow.addEventListener("afterprint", cleanup, { once: true });
    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    showToast?.('🖨️ In the print dialog, choose "Save as PDF" to download.');

    // Safety net in case neither afterprint nor window focus ever fires
    // (observed on a handful of embedded/in-app mobile browsers).
    setTimeout(cleanup, 60000);
  } catch (error) {
    console.error("[PDF] Print generation failed:", error);
    showToast?.("Unable to generate the PDF. Please try again.");
    cleanup();
  }
}