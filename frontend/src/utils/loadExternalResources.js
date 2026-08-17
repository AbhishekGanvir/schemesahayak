// =====================================================================
// EXTERNAL RESOURCES
// =====================================================================
//
// html2pdf.js is installed through npm and bundled by Vite.
// Only Font Awesome remains external here.
// =====================================================================

export function loadExternalResources() {
  if (
    !document.getElementById(
      "font-awesome-cdn"
    )
  ) {
    const fa =
      document.createElement(
        "link"
      );

    fa.id =
      "font-awesome-cdn";

    fa.rel =
      "stylesheet";

    fa.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";

    document.head.appendChild(
      fa
    );
  }
}