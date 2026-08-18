// =====================================================================
// SCHEME PDF GENERATOR
// =====================================================================
//
// Uses html2pdf.js installed through npm.
// No CDN script injection.
// No window.html2pdf dependency.
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

import html2pdf from "html2pdf.js";
import { isMeaningfulValue } from "./isMeaningfulValue.js";
import {
  documentLabel,
  applicationModeLabel,
  applicationStepLabel,
} from "./schemeFormatters.js";

// =====================================================================
// BRAND LOGO (inline SVG — matches the mark used on the site header)
// =====================================================================
//
// Sized down from the source 240x240 icon; viewBox kept intact so it
// scales cleanly. Embedded inline (not as an <img src>) so html2canvas
// renders it reliably without an extra network/asset fetch.
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
  if (
    value === null ||
    value === undefined
  ) {
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
    const parts = value
      .map(formatEligibilityValuePdf)
      .filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }

  if (typeof value === "object") {
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

    // Income object — only render an amount when one is actually set.
    if ("maximum_annual_family_income" in value) {
      if (isMeaningfulValue(value.maximum_annual_family_income)) {
        const amount = Number(
          value.maximum_annual_family_income
        ).toLocaleString("en-IN");
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
    const entries = Object.entries(value).filter(([, v]) =>
      isMeaningfulValue(v)
    );

    if (entries.length === 0) {
      return null;
    }

    if (entries.length === 1) {
      return formatEligibilityValuePdf(entries[0][1]);
    }

    return entries
      .map(
        ([key, v]) =>
          `${key.replace(/_/g, " ")}: ${formatEligibilityValuePdf(v)}`
      )
      .join(" • ");
  }

  return String(value);
}

// =====================================================================
// BUILD PDF HTML
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

  const conditionLines = (
    Array.isArray(eligibility.conditions) ? eligibility.conditions : []
  )
    .filter((c) => isMeaningfulValue(c))
    .map((condition) => `Condition: ${formatEligibilityValuePdf(condition)}`);

  const allEligibilityLines = [...eligibilityLines, ...conditionLines];

  const documents = (
    Array.isArray(documents_required) ? documents_required : []
  )
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

  // display: inline-flex + align-items: center + a fixed line-height
  // is what actually centers the text inside the pill — inline-block
  // alone lets the browser's default line box push the text toward
  // the bottom, which is why the badges looked bottom-heavy before.
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
  // Section component's look on the detail page (colored icon, bold
  // title, thin divider).
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

  const cardStyle = `
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  `;

  return `
    <div
      style="
        width: 740px;
        box-sizing: border-box;
        background: #ffffff;
        color: #1e293b;
        font-family: Arial, Helvetica, sans-serif;
        padding: 22px 26px;
        line-height: 1.4;
        font-size: 12px;
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
// DOWNLOAD PDF
// =====================================================================

export async function downloadSchemePdf(
  scheme,
  pdfPrintContainerRef,
  showToast
) {
  if (!scheme) {
    return;
  }

  if (
    !pdfPrintContainerRef ||
    !pdfPrintContainerRef.current
  ) {
    console.error(
      "[PDF] Missing PDF container ref."
    );

    showToast(
      "Unable to prepare PDF."
    );

    return;
  }

  const container =
    pdfPrintContainerRef.current;

  const fileName =
    `Sarkaari-Saathi-${
      scheme.scheme_id ||
      scheme.id ||
      "scheme"
    }.pdf`;

  // ---------------------------------------------------------------
  // Save page state
  // ---------------------------------------------------------------

  const prevScrollX =
    window.scrollX;

  const prevScrollY =
    window.scrollY;

  const prevHtmlOverflow =
    document.documentElement.style.overflow;

  const prevBodyOverflow =
    document.body.style.overflow;

  window.scrollTo(0, 0);

  document.documentElement.style.overflow =
    "hidden";

  document.body.style.overflow =
    "hidden";

  try {
    // -------------------------------------------------------------
    // Build temporary PDF content
    // -------------------------------------------------------------

    container.innerHTML =
      buildSchemePdfHtml(
        scheme
      );

    // NOTE: no explicit container width here — this is the fix for the
    // content-hugging-the-left-of-the-page bug. The HTML returned by
    // buildSchemePdfHtml() is itself a fixed-width (700px) box. If the
    // container is *also* forced to a different fixed width (it used
    // to be 750px), the child sits flush-left inside it and the extra
    // width becomes a dead strip on the right that gets captured into
    // the canvas and carried straight into the PDF. Leaving width
    // unset lets this fixed-position container shrink-wrap tightly
    // around its child, so the captured image is exactly the content's
    // size — no lopsided margins once it's placed on the page.

    container.style.background =
      "#ffffff";

    container.style.color =
      "#0f172a";

    container.style.display =
      "block";

    container.style.position =
      "fixed";

    container.style.left =
      "0";

    container.style.top =
      "0";

    container.style.zIndex =
      "-1";

    // -------------------------------------------------------------
    // Allow browser to render
    // -------------------------------------------------------------

    await new Promise(
      (resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(
            resolve
          );
        });
      }
    );

    const width =
      Math.ceil(
        container.getBoundingClientRect()
          .width
      ) ||
      container.scrollWidth;

    const height =
      Math.ceil(
        container.scrollHeight
      );

    if (
      !width ||
      !height
    ) {
      throw new Error(
        "PDF container has zero dimensions."
      );
    }

    showToast(
      "📄 Generating PDF..."
    );

    // -------------------------------------------------------------
    // PDF OPTIONS
    // -------------------------------------------------------------

    const options = {
      // 0.3in margins on a letter page (8.5in) leave a 7.9in / ~758px
      // interior at 96dpi — the 740px content box above fits that with
      // a small buffer, so it fills the page width instead of leaving
      // a gap. Reduced from 0.4in to also claw back some of the dead
      // space that was piling up above the content.
      margin: 0.3,

      filename: fileName,

      image: {
        type: "jpeg",
        quality: 0.98,
      },

      html2canvas: {
        scale: 2,

        backgroundColor:
          "#ffffff",

        useCORS: true,

        allowTaint: false,

        logging: false,

        width,

        height,

        windowWidth:
          width,

        windowHeight:
          height,

        x: 0,

        y: 0,

        scrollX: 0,

        scrollY: 0,
      },

      jsPDF: {
        unit: "in",

        format: "letter",

        orientation:
          "portrait",

        compress: true,
      },

      pagebreak: {
        mode: [
          "css",
          "legacy",
        ],
      },
    };

    // -------------------------------------------------------------
    // GENERATE
    // -------------------------------------------------------------

    await html2pdf()
      .set(options)
      .from(container)
      .save();

    showToast(
      "✅ Scheme PDF downloaded."
    );

  } catch (error) {

    console.error(
      "[PDF] Generation failed:",
      error
    );

    showToast(
      "Unable to generate the PDF. Please try again."
    );

  } finally {

    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------

    container.innerHTML = "";

    container.style.display =
      "";

    container.style.position =
      "";

    container.style.left =
      "";

    container.style.top =
      "";

    container.style.zIndex =
      "";

    document.documentElement.style.overflow =
      prevHtmlOverflow;

    document.body.style.overflow =
      prevBodyOverflow;

    window.scrollTo(
      prevScrollX,
      prevScrollY
    );
  }
}