// =====================================================================
// SCHEME PDF GENERATOR
// =====================================================================
//
// Uses html2pdf.js installed through npm.
// No CDN script injection.
// No window.html2pdf dependency.
//
// =====================================================================

import html2pdf from "html2pdf.js";

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
// BUILD PDF HTML
// =====================================================================

export function buildSchemePdfHtml(scheme) {
  if (!scheme) {
    return "";
  }

  const {
    identifiers = {},
    authority = {},
    benefit = {},
    description = {},
    eligibility = {},
    documents_required = [],
    application = {},
    source = {}
  } = scheme;

  const summary =
    description.summary ||
    description.short ||
    description.full ||
    "No description available.";

  const benefitText =
    benefit.benefit_description ||
    (
      benefit.amount
        ? `${benefit.currency || "₹"}${benefit.amount}${
            benefit.frequency
              ? ` (${benefit.frequency})`
              : ""
          }`
        : "Not specified."
    );

  const eligibilityLines = [
    eligibility.age &&
      `Age: ${formatPdfValue(eligibility.age)}`,

    eligibility.gender &&
      `Gender: ${formatPdfValue(eligibility.gender)}`,

    eligibility.residency &&
      `Residency: ${formatPdfValue(eligibility.residency)}`,

    eligibility.income &&
      `Income: ${formatPdfValue(eligibility.income)}`,

    eligibility.bank_account &&
      `Bank Account: ${formatPdfValue(
        eligibility.bank_account
      )}`,

    ...(Array.isArray(eligibility.conditions)
      ? eligibility.conditions.map(
          (condition) =>
            `Condition: ${formatPdfValue(condition)}`
        )
      : [])
  ].filter(Boolean);

  const documents =
    Array.isArray(documents_required)
      ? documents_required
      : [];

  const steps =
    Array.isArray(application.steps)
      ? application.steps
      : [];

  return `
    <div
      style="
        width: 720px;
        box-sizing: border-box;
        background: #ffffff;
        color: #1e293b;
        font-family: Arial, Helvetica, sans-serif;
        padding: 32px;
        line-height: 1.5;
        font-size: 12px;
      "
    >

      <div
        style="
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 12px;
          margin-bottom: 20px;
        "
      >
        <h1
          style="
            color: #1e3a8a;
            font-size: 21px;
            margin: 0;
          "
        >
          🏛️ Scheme Sahayak
        </h1>

        <p
          style="
            font-size: 10px;
            color: #64748b;
            margin: 3px 0 0;
          "
        >
          Government Scheme Reference Sheet
          • Generated ${escapeHtml(
            new Date().toLocaleDateString("en-IN")
          )}
        </p>
      </div>

      <div
        style="
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 18px;
        "
      >

        ${
          authority.government_level
            ? `
              <div
                style="
                  display: inline-block;
                  background: #dbeafe;
                  color: #1e40af;
                  font-size: 9px;
                  font-weight: bold;
                  padding: 4px 9px;
                  border-radius: 5px;
                  margin-bottom: 8px;
                "
              >
                ${escapeHtml(
                  authority.government_level
                )}
              </div>
            `
            : ""
        }

        <h2
          style="
            font-size: 18px;
            color: #0f172a;
            margin: 0 0 5px;
          "
        >
          ${escapeHtml(
            scheme.scheme_name ||
            "Unnamed Scheme"
          )}
        </h2>

        ${
          scheme.scheme_name_local
            ? `
              <p
                style="
                  font-size: 10px;
                  color: #64748b;
                  margin: 0 0 7px;
                "
              >
                ${escapeHtml(
                  scheme.scheme_name_local
                )}
              </p>
            `
            : ""
        }

        <p
          style="
            font-size: 11px;
            color: #334155;
            margin: 0;
          "
        >
          ${escapeHtml(summary)}
        </p>
      </div>

      <div style="margin-bottom: 15px;">
        <strong
          style="
            color: #1e3a8a;
            font-size: 12px;
          "
        >
          KEY BENEFIT
        </strong>

        <div
          style="
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            padding: 10px;
            margin-top: 5px;
            border-radius: 5px;
            color: #065f46;
          "
        >
          ${escapeHtml(benefitText)}
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <strong
          style="
            color: #1e3a8a;
            font-size: 12px;
          "
        >
          ELIGIBILITY CRITERIA
        </strong>

        ${
          eligibilityLines.length
            ? `
              <ul
                style="
                  margin: 5px 0 0;
                  padding-left: 18px;
                  font-size: 11px;
                "
              >
                ${eligibilityLines
                  .map(
                    (line) => `
                      <li style="margin-bottom: 3px;">
                        ${escapeHtml(line)}
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            `
            : `
              <p
                style="
                  font-size: 11px;
                  margin: 5px 0 0;
                "
              >
                Not specified.
              </p>
            `
        }
      </div>

      <div style="margin-bottom: 15px;">
        <strong
          style="
            color: #1e3a8a;
            font-size: 12px;
          "
        >
          REQUIRED DOCUMENTS
        </strong>

        ${
          documents.length
            ? `
              <ul
                style="
                  margin: 5px 0 0;
                  padding-left: 18px;
                  font-size: 11px;
                "
              >
                ${documents
                  .map(
                    (doc) => `
                      <li style="margin-bottom: 3px;">
                        ${escapeHtml(
                          formatPdfValue(doc)
                        )}
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            `
            : `
              <p
                style="
                  font-size: 11px;
                  margin: 5px 0 0;
                "
              >
                Not specified.
              </p>
            `
        }
      </div>

      <div style="margin-bottom: 15px;">
        <strong
          style="
            color: #1e3a8a;
            font-size: 12px;
          "
        >
          HOW TO APPLY
        </strong>

        ${
          steps.length
            ? `
              <ol
                style="
                  margin: 5px 0 0;
                  padding-left: 18px;
                  font-size: 11px;
                "
              >
                ${steps
                  .map(
                    (step) => `
                      <li style="margin-bottom: 4px;">
                        ${escapeHtml(
                          formatPdfValue(step)
                        )}
                      </li>
                    `
                  )
                  .join("")}
              </ol>
            `
            : `
              <p
                style="
                  font-size: 11px;
                  margin: 5px 0 0;
                "
              >
                Not specified.
              </p>
            `
        }
      </div>

      <div
        style="
          margin-top: 20px;
          background: #f1f5f9;
          padding: 12px;
          border-radius: 6px;
          font-size: 10px;
          border: 1px solid #e2e8f0;
        "
      >

        <strong>
          Ministry / Department:
        </strong>

        ${escapeHtml(
          authority.ministry_department ||
          "Not specified"
        )}

        <br />

        <strong>
          Category:
        </strong>

        ${escapeHtml(
          identifiers.category ||
          "Not specified"
        )}

        ${
          source.official_website
            ? `
              <br />

              <strong>
                Official Portal:
              </strong>

              ${escapeHtml(
                source.official_website
              )}
            `
            : ""
        }
      </div>

      <div
        style="
          margin-top: 25px;
          padding-top: 10px;
          border-top: 1px solid #cbd5e1;
          color: #64748b;
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
// FORMAT PDF VALUE
// =====================================================================

function formatPdfValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value
      .map(formatPdfValue)
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(
        ([key, val]) =>
          `${key.replace(
            /_/g,
            " "
          )}: ${formatPdfValue(val)}`
      )
      .join(" • ");
  }

  return String(value);
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

    container.style.width =
      "750px";

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
      margin: 0.4,

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