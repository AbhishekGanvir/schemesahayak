import { useEffect, useRef, useState } from 'react';
import { askGemini, askGeminiSpeech, clearGeminiSchemeCache } from '../services/api.js';
import { useVoiceRecognition } from './useVoiceRecognition';

const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Consolidates all AI Assistant / chat state and handlers. Lifted out
// of the page component (and used from App.jsx) so the conversation
// persists correctly when the user navigates to Search or Scheme
// Detail and back to Home, exactly like the original single-file app.
export function useChatAssistant({ showToast, currentView, navigateTo, disclaimerAccepted, requestDisclaimer }) {
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text:
        "Welcome to Scheme Sahayak. I can help you discover government schemes relevant to your needs and circumstances.\n\n🎙️ **Voice Search:** Ask your query in Hindi or English using the microphone.\n👉 **Profile Selection:** Select a profile or enter your details in the search field to find relevant schemes.",
      matchedSchemes: [],
      time: timeNow()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [inputHighlighted, setInputHighlighted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const chatMessagesEndRef = useRef(null);
  const userInputRef = useRef(null);
  const requestIdRef = useRef(0);

  // Clear temporary Gemini scheme cache when the website is left/closed.
  // Normal React navigation inside the app does NOT trigger this.
  useEffect(() => {
    const handlePageLeave = () => {
      clearGeminiSchemeCache();
    };

    window.addEventListener('pagehide', handlePageLeave);

    return () => {
      window.removeEventListener('pagehide', handlePageLeave);
    };
  }, []);

  // The disclaimer flag can change between renders (accepted mid-session),
  // so keep a ref in sync for handlers created inside useVoiceRecognition
  // that may fire from an async browser callback.
  const disclaimerAcceptedRef = useRef(disclaimerAccepted);
  useEffect(() => {
    disclaimerAcceptedRef.current = disclaimerAccepted;
  }, [disclaimerAccepted]);

  // Blocks any AI Assistant action (send / mic / suggested question /
  // "Ask AI from a scheme") until the disclaimer has been accepted,
  // showing a popup instead of letting the action reach the API.
  const ensureDisclaimerAccepted = () => {
    if (!disclaimerAcceptedRef.current) {
      if (typeof requestDisclaimer === 'function') requestDisclaimer();
      return false;
    }
    return true;
  };

  const scrollToChatBottom = () => {
    if (chatMessagesEndRef.current) {
      // Only scroll the chat container itself, not the whole page window.
      const container = chatMessagesEndRef.current.parentElement;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (currentView === 'home') {
      scrollToChatBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages, currentView]);

  const runQuery = (text, { isVoice = false } = {}) => {
    const timeStr = timeNow();

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text,
      matchedSchemes: [],
      time: timeStr
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    const requestId = ++requestIdRef.current;
    const caller = askGemini({
  query: text,
  userId: 'guest'
});

    caller
      .then(({ replyText, schemesArray, rawResult }) => {
        if (requestId !== requestIdRef.current) return;
        const botMsg = {
          id: Date.now() + 1,
          role: 'bot',
          text: replyText,
          matchedSchemes: schemesArray,
          rawResult,
          time: timeNow()
        };
        setChatMessages((prev) => [...prev, botMsg]);
      })
      .catch((err) => {
        if (err.name === 'AbortError' || requestId !== requestIdRef.current) return;

        // Distinct, friendly message for a genuine network/API failure
        // (as opposed to an "unrelated query" or "disclaimer" message,
        // which arrive as normal successful responses and are handled
        // above via replyText).
        const isNetworkError = err.status === 0 || !err.status;
        const botMsg = {
          id: Date.now() + 1,
          role: 'bot',
          text: isNetworkError
            ? "Sorry, I couldn't reach the assistant right now. Please check your connection and try again."
            : "Something went wrong while processing your question. Please try again in a moment.",
          matchedSchemes: [],
          time: timeNow(),
          isError: true
        };
        setChatMessages((prev) => [...prev, botMsg]);
        showToast('AI assistant is unavailable. Please try again.');
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsSending(false);
      });
  };

  const handleSendMessage = (textToSend, options) => {
    if (!ensureDisclaimerAccepted()) return;
    const text = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!text || isSending) return;
    runQuery(text, options);
  };

  const resetChat = () => {
  // Invalidate any currently running Gemini request.
  requestIdRef.current += 1;

  // Stop showing the loading state.
  setIsSending(false);

  // Clear all Gemini-generated scheme objects from localStorage.
  clearGeminiSchemeCache();

  // Start a completely fresh conversation.
  setChatMessages([
    {
      id: Date.now(),
      role: 'bot',
      text:
        'New chat started! Type a question or select a profile on the right panel.',
      matchedSchemes: [],
      time: timeNow()
    }
  ]);

  // Also clear the current input.
  setInputText('');

  showToast('New chat started.');
};

  // Pre-fills the chat input without auto-sending, switching to the
  // Home view first if the user isn't already there.
  const populatePromptOnly = (text) => {
    if (!ensureDisclaimerAccepted()) return;
    if (!text) return;

    setInputText(text);

    if (currentView !== 'home') {
      navigateTo('home');
    }

    setTimeout(() => {
      if (userInputRef.current) userInputRef.current.focus({ preventScroll: true });

      setInputHighlighted(true);
      setTimeout(() => setInputHighlighted(false), 1200);

      showToast('Populated into input field! Edit or press Send.');
    }, 150);
  };

  const setProfileToInput = (profileName) => {
    if (!ensureDisclaimerAccepted()) return;
    const query = `What are the top government schemes available for ${profileName}?`;
    populatePromptOnly(query);
  };

  const askAiAboutCurrentScheme = (selectedScheme) => {
    if (!ensureDisclaimerAccepted()) return;
    if (!selectedScheme) return;
    const text = `Explain eligibility and application steps for ${selectedScheme.scheme_name}`;
    populatePromptOnly(text);
  };

  const {
    isListening,
    voiceLang,
    toggleVoiceLang,
    toggleVoiceRecognition: rawToggleVoiceRecognition,
    stopVoiceRecognition,
    speakText
  } = useVoiceRecognition({
    showToast,
    onTranscript: (transcript) => {
      if (!transcript || !transcript.trim() || isSending) return;
      setInputText(transcript);
      handleSendMessage(transcript, { isVoice: true });
    }
  });

  const toggleVoiceRecognition = () => {
    if (!ensureDisclaimerAccepted()) return;
    rawToggleVoiceRecognition();
  };

  return {
    chatMessages,
    inputText,
    setInputText,
    inputHighlighted,
    isSending,
    chatMessagesEndRef,
    userInputRef,
    handleSendMessage,
    resetChat,
    populatePromptOnly,
    setProfileToInput,
    askAiAboutCurrentScheme,
    isListening,
    voiceLang,
    toggleVoiceLang,
    toggleVoiceRecognition,
    stopVoiceRecognition,
    speakText
  };
}
