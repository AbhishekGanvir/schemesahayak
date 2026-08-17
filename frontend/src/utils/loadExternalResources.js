// Injects the FontAwesome stylesheet and html2pdf.js bundle from CDN,
// matching the original single-file app's behavior. Safe to call more
// than once — it checks for existing tags before injecting.
export function loadExternalResources() {
  if (!document.getElementById('font-awesome-cdn')) {
    const fa = document.createElement('link');
    fa.id = 'font-awesome-cdn';
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);
  }

  if (!window.html2pdf && !document.getElementById('html2pdf-cdn')) {
    const script = document.createElement('script');
    script.id = 'html2pdf-cdn';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.body.appendChild(script);
  }
}
