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


const DISCLAIMER_STORAGE_KEY =
  'scheme_sahayak_disclaimer_accepted';


// ============================================================================
// URL ROUTING HELPERS
// ============================================================================

function getCurrentPath() {
  return window.location.pathname;
}


/*
|--------------------------------------------------------------------------
| Convert browser URL → application view
|--------------------------------------------------------------------------
|
| /
|     → home
|
| /directory
|     → search
|
| /scheme/:schemeId
|     → detail
|
*/

function getViewFromPath(pathname) {

  if (pathname === '/directory') {
    return 'search';
  }

  if (pathname.startsWith('/scheme/')) {
    return 'detail';
  }

  return 'home';
}


/*
|--------------------------------------------------------------------------
| Extract scheme ID from:
|
| /scheme/pm-kisan
|
|--------------------------------------------------------------------------
*/

function getSchemeIdFromPath(pathname) {

  if (!pathname.startsWith('/scheme/')) {
    return null;
  }

  const encodedId =
    pathname.substring('/scheme/'.length);

  if (!encodedId) {
    return null;
  }

  try {
    return decodeURIComponent(encodedId);
  } catch (error) {
    return encodedId;
  }
}


// ============================================================================
// DISCLAIMER
// ============================================================================

function readStoredDisclaimerAcceptance() {

  try {

    return (
      window.localStorage.getItem(
        DISCLAIMER_STORAGE_KEY
      ) === 'true'
    );

  } catch (e) {

    return false;

  }
}


// ============================================================================
// APP
// ============================================================================

export default function App() {

  // --------------------------------------------------------------------------
  // URL / VIEW STATE
  // --------------------------------------------------------------------------

  /*
  |--------------------------------------------------------------------------
  | Instead of:
  |
  | const [currentView, setCurrentView] = useState('home');
  |
  | we now derive the view from the real browser URL.
  |--------------------------------------------------------------------------
  */

  const [
    currentPath,
    setCurrentPath
  ] = useState(getCurrentPath);


  const currentView =
    getViewFromPath(currentPath);


  // --------------------------------------------------------------------------
  // SCHEME DETAIL STATE
  // --------------------------------------------------------------------------

  const [
    selectedScheme,
    setSelectedScheme
  ] = useState(null);


  const [
    selectedSchemeId,
    setSelectedSchemeId
  ] = useState(null);


  const [
    schemeDetailLoading,
    setSchemeDetailLoading
  ] = useState(false);


  const [
    schemeDetailError,
    setSchemeDetailError
  ] = useState(null);


  // --------------------------------------------------------------------------
  // DISCLAIMER STATE
  // --------------------------------------------------------------------------

  const [
    disclaimerAccepted,
    setDisclaimerAccepted
  ] = useState(
    readStoredDisclaimerAcceptance
  );


  const [
    showDisclaimerGate,
    setShowDisclaimerGate
  ] = useState(false);


  // --------------------------------------------------------------------------
  // TOAST
  // --------------------------------------------------------------------------

  const [
    toastMsg,
    setToastMsg
  ] = useState(null);


  // ==========================================================================
  // LOAD EXTERNAL RESOURCES
  // ==========================================================================

  useEffect(() => {

    loadExternalResources();

  }, []);


  // ==========================================================================
  // BROWSER BACK / FORWARD
  // ==========================================================================

  /*
  |--------------------------------------------------------------------------
  | When the user presses:
  |
  | ← Back
  | → Forward
  |
  | the browser fires popstate.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    const handlePopState = () => {

      setCurrentPath(
        window.location.pathname
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

    };


    window.addEventListener(
      'popstate',
      handlePopState
    );


    return () => {

      window.removeEventListener(
        'popstate',
        handlePopState
      );

    };

  }, []);


  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  /*
  |--------------------------------------------------------------------------
  | Existing components still call:
  |
  | navigateTo('home')
  | navigateTo('search')
  |
  | so we keep that API.
  |--------------------------------------------------------------------------
  */

  const navigateTo = (viewId) => {

    let newPath = '/';


    if (viewId === 'home') {

      newPath = '/';

    }


    if (viewId === 'search') {

      newPath = '/directory';

    }


    /*
    |--------------------------------------------------------------------------
    | Detail navigation normally happens through openSchemeDetail()
    |--------------------------------------------------------------------------
    */

    if (
      viewId === 'detail'
    ) {

      /*
      | If there is already a selected scheme,
      | keep its URL.
      */

      if (selectedSchemeId) {

        newPath =
          `/scheme/${encodeURIComponent(
            selectedSchemeId
          )}`;

      } else {

        /*
        | If there is no scheme ID, don't create
        | an invalid /scheme/ URL.
        */

        newPath = '/';

      }

    }


    /*
    |--------------------------------------------------------------------------
    | Don't create duplicate browser history entries
    |--------------------------------------------------------------------------
    */

    if (
      window.location.pathname !== newPath
    ) {

      window.history.pushState(
        {},
        '',
        newPath
      );

    }


    setCurrentPath(newPath);


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  };


  // ==========================================================================
  // TOAST
  // ==========================================================================

  const showToast = (msg) => {

    setToastMsg(msg);

    setTimeout(() => {

      setToastMsg(null);

    }, 2600);

  };


  // ==========================================================================
  // LOAD SCHEME DETAIL
  // ==========================================================================

  const loadSchemeDetail = (
    schemeId,
    signal = undefined
  ) => {

    if (!schemeId) {

      setSchemeDetailError(
        'not-found'
      );

      return;

    }


    setSelectedSchemeId(
      schemeId
    );


    setSelectedScheme(null);


    setSchemeDetailError(null);


    setSchemeDetailLoading(true);


    getSchemeById(
      schemeId,
      {
        signal
      }
    )

      .then((detail) => {

        if (!detail) {

          setSchemeDetailError(
            'not-found'
          );

          return;

        }


        setSelectedScheme(
          detail
        );

      })


      .catch((err) => {

        if (
          err?.name ===
          'AbortError'
        ) {

          return;

        }


        setSchemeDetailError(
          err?.status === 404
            ? 'not-found'
            : 'error'
        );

      })


      .finally(() => {

        /*
        | Only stop loading if this request
        | was not cancelled.
        */

        if (
          !signal?.aborted
        ) {

          setSchemeDetailLoading(
            false
          );

        }

      });

  };


  // ==========================================================================
  // LOAD SCHEME WHEN URL IS /scheme/:schemeId
  // ==========================================================================

  useEffect(() => {

    if (
      currentView !== 'detail'
    ) {

      return;

    }


    const schemeId =
      getSchemeIdFromPath(
        currentPath
      );


    if (!schemeId) {

      setSchemeDetailError(
        'not-found'
      );

      return;

    }


    const controller =
      new AbortController();


    /*
    |--------------------------------------------------------------------------
    | Only reload if the URL scheme changed.
    |--------------------------------------------------------------------------
    */

    if (
      selectedSchemeId !== schemeId
    ) {

      loadSchemeDetail(
        schemeId,
        controller.signal
      );

    }


    return () => {

      controller.abort();

    };

  }, [
    currentPath
  ]);


  // ==========================================================================
  // OPEN SCHEME DETAIL
  // ==========================================================================

  const openSchemeDetail = (
    schemeId
  ) => {

    if (!schemeId) {

      return;

    }


    const newPath =
      `/scheme/${encodeURIComponent(
        String(schemeId)
      )}`;


    /*
    |--------------------------------------------------------------------------
    | Update real browser URL
    |--------------------------------------------------------------------------
    */

    window.history.pushState(
      {},
      '',
      newPath
    );


    /*
    |--------------------------------------------------------------------------
    | Tell React that the URL changed.
    |--------------------------------------------------------------------------
    */

    setCurrentPath(
      newPath
    );


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  };


  // ==========================================================================
  // RETRY SCHEME
  // ==========================================================================

  const retrySchemeDetail = () => {

    const schemeId =
      selectedSchemeId ||
      getSchemeIdFromPath(
        currentPath
      );


    if (schemeId) {

      loadSchemeDetail(
        schemeId
      );

    }

  };


  // ==========================================================================
  // DISCLAIMER
  // ==========================================================================

  const acceptDisclaimer = () => {

    setDisclaimerAccepted(
      true
    );


    setShowDisclaimerGate(
      false
    );


    try {

      window.localStorage.setItem(
        DISCLAIMER_STORAGE_KEY,
        'true'
      );

    } catch (e) {

      /*
      | Ignore storage failures.
      | Acceptance still works for this session.
      */

    }


    showToast(
      'Disclaimer acknowledged.'
    );

  };


  const requestDisclaimer = () => {

    setShowDisclaimerGate(
      true
    );

  };


  // ==========================================================================
  // CHAT / AI ASSISTANT
  // ==========================================================================

  /*
  |--------------------------------------------------------------------------
  | Chat state remains here so the conversation survives navigation.
  |--------------------------------------------------------------------------
  */

  const chat =
    useChatAssistant({

      showToast,

      currentView,

      navigateTo,

      disclaimerAccepted,

      requestDisclaimer

    });


  const askAiAboutCurrentScheme =
    () => {

      chat.askAiAboutCurrentScheme(
        selectedScheme
      );

    };


  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (

    <div
      className="
        bg-slate-50
        text-slate-800
        font-sans
        antialiased
        min-h-screen
        flex
        flex-col
        relative
      "
    >

      {/* ================================================================
          TOAST
      ================================================================= */}

      <Toast
        message={toastMsg}
      />


      {/* ================================================================
          HEADER
      ================================================================= */}

      <Header
        currentView={
          currentView
        }
        navigateTo={
          navigateTo
        }
      />


      {/* ================================================================
          MAIN CONTENT
      ================================================================= */}

      <main
        className="
          flex-grow
          pb-24
        "
      >

        {/* ============================================================
            HOME
        ============================================================= */}

        {currentView === 'home' && (

          <Home
            navigateTo={
              navigateTo
            }

            openSchemeDetail={
              openSchemeDetail
            }

            chat={
              chat
            }
          />

        )}


        {/* ============================================================
            SEARCH DIRECTORY
        ============================================================= */}

        {currentView === 'search' && (

          <SearchDirectory
            navigateTo={
              navigateTo
            }

            openSchemeDetail={
              openSchemeDetail
            }

            onAskAi={
              chat.populatePromptOnly
            }
          />

        )}


        {/* ============================================================
            SCHEME DETAIL
        ============================================================= */}

        {currentView === 'detail' && (

          <SchemeDetail

            scheme={
              selectedScheme
            }

            loading={
              schemeDetailLoading
            }

            error={
              schemeDetailError
            }

            onRetry={
              retrySchemeDetail
            }

            navigateTo={
              navigateTo
            }

            showToast={
              showToast
            }

            onAskAi={
              askAiAboutCurrentScheme
            }

          />

        )}

      </main>


      {/* ================================================================
          DISCLAIMER BANNER
      ================================================================= */}

      {!disclaimerAccepted && (

        <DisclaimerBanner
          onAccept={
            acceptDisclaimer
          }
        />

      )}


      {/* ================================================================
          DISCLAIMER GATE MODAL
      ================================================================= */}

      {showDisclaimerGate && (

        <DisclaimerGateModal

          onAccept={
            acceptDisclaimer
          }

          onClose={() =>
            setShowDisclaimerGate(
              false
            )
          }

        />

      )}


      {/* ================================================================
          FOOTER
      ================================================================= */}

      <Footer />

    </div>

  );

}