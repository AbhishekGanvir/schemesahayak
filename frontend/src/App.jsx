import React, { useEffect, useState } from 'react';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import DisclaimerBanner from './components/layout/DisclaimerBanner.jsx';
import DisclaimerGateModal from './components/layout/DisclaimerGateModal.jsx';
import Toast from './components/layout/Toast.jsx';
import Home from './pages/Home.jsx';
import SearchDirectory from './pages/SearchDirectory.jsx';
import SchemeDetail from './pages/SchemeDetail.jsx';
import { getSchemeById } from './services/api.js';
import { useChatAssistant } from './hooks/useChatAssistant';
import { loadExternalResources } from './utils/loadExternalResources';

const DISCLAIMER_STORAGE_KEY = 'sarkaari_saathi_disclaimer_accepted';

function readStoredDisclaimerAcceptance() {
  try {
    return window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === 'true';
  } catch (e) {
    // localStorage may be unavailable (private browsing, SSR, etc.)
    return false;
  }
}

export default function App() {
  // Navigation View: 'home' | 'search' | 'detail'
  const [currentView, setCurrentView] = useState('home');

  // Scheme Detail view state — fetched from the backend on demand.
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState(null);
  const [schemeDetailLoading, setSchemeDetailLoading] = useState(false);
  const [schemeDetailError, setSchemeDetailError] = useState(null);

  // Bottom Disclaimer Banner + Blocking Popup State.
  // Restored from localStorage so accepting it once persists across
  // refreshes/sessions.
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(readStoredDisclaimerAcceptance);
  const [showDisclaimerGate, setShowDisclaimerGate] = useState(false);

  // Toast Notification State
  const [toastMsg, setToastMsg] = useState(null);

  // Load CDN Resources (FontAwesome & html2pdf)
  useEffect(() => {
    loadExternalResources();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const navigateTo = (viewId) => {
    setCurrentView(viewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadSchemeDetail = (schemeId) => {
    setSelectedSchemeId(schemeId);
    setSelectedScheme(null);
    setSchemeDetailError(null);
    setSchemeDetailLoading(true);

    const controller = new AbortController();

    getSchemeById(schemeId, { signal: controller.signal })
      .then((detail) => {
        if (!detail) {
          setSchemeDetailError('not-found');
        } else {
          setSelectedScheme(detail);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setSchemeDetailError(err.status === 404 ? 'not-found' : 'error');
      })
      .finally(() => setSchemeDetailLoading(false));

    return () => controller.abort();
  };

  const openSchemeDetail = (schemeId) => {
    navigateTo('detail');
    loadSchemeDetail(schemeId);
  };

  const retrySchemeDetail = () => {
    if (selectedSchemeId) loadSchemeDetail(selectedSchemeId);
  };

  const acceptDisclaimer = () => {
    setDisclaimerAccepted(true);
    setShowDisclaimerGate(false);
    try {
      window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true');
    } catch (e) {
      // Ignore storage failures — acceptance still holds for this session.
    }
    showToast('Disclaimer acknowledged.');
  };

  const requestDisclaimer = () => setShowDisclaimerGate(true);

  // Chat/AI Assistant state lives here (rather than inside the Home page)
  // so the conversation persists when navigating to Search or Scheme
  // Detail and back — exactly like the original single-file app.
  const chat = useChatAssistant({
    showToast,
    currentView,
    navigateTo,
    disclaimerAccepted,
    requestDisclaimer
  });

  const askAiAboutCurrentScheme = () => chat.askAiAboutCurrentScheme(selectedScheme);

  return (
    // Fixed white gap after footer by removing pb-16. Footer now correctly attaches to bottom.
    <div className="bg-slate-50 text-slate-800 font-sans antialiased min-h-screen flex flex-col relative">
      <Toast message={toastMsg} />

      <Header currentView={currentView} navigateTo={navigateTo} />

      {/* Adding padding-bottom to main so content isn't completely hidden behind disclaimer */}
      <main className="flex-grow pb-24">
        {currentView === 'home' && <Home navigateTo={navigateTo} openSchemeDetail={openSchemeDetail} chat={chat} />}

        {currentView === 'search' && (
          <SearchDirectory navigateTo={navigateTo} openSchemeDetail={openSchemeDetail} onAskAi={chat.populatePromptOnly} />
        )}

        {currentView === 'detail' && (
          <SchemeDetail
            scheme={selectedScheme}
            loading={schemeDetailLoading}
            error={schemeDetailError}
            onRetry={retrySchemeDetail}
            navigateTo={navigateTo}
            showToast={showToast}
            onAskAi={askAiAboutCurrentScheme}
          />
        )}
      </main>

      {!disclaimerAccepted && <DisclaimerBanner onAccept={acceptDisclaimer} />}

      {showDisclaimerGate && (
        <DisclaimerGateModal onAccept={acceptDisclaimer} onClose={() => setShowDisclaimerGate(false)} />
      )}

      <Footer />
    </div>
  );
}
