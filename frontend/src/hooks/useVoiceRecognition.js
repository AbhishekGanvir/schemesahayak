import { useRef, useState } from 'react';
import { textToSpeech } from '../services/api.js';

// ---------------------------------------------------------------------
// Text-to-speech helpers
// ---------------------------------------------------------------------

// Splits text into sentence-sized (and, for very long sentences,
// further word-wrapped) chunks. Chrome's speechSynthesis has a
// long-standing bug where a single long utterance silently stops
// after a few seconds/words — speaking short chunks back-to-back via
// the utterance's `onend` callback works around it reliably.
const SENTENCE_SPLIT_REGEX = /(?<=[.!?।])\s+/;
const MAX_CHUNK_LENGTH = 180;

function splitIntoSpeechChunks(text) {
  const sentences = text
    .split(SENTENCE_SPLIT_REGEX)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];

  for (const sentence of sentences.length ? sentences : [text]) {
    if (sentence.length <= MAX_CHUNK_LENGTH) {
      chunks.push(sentence);
      continue;
    }

    // Word-wrap very long sentences so no single utterance is too long.
    let remainder = sentence;
    while (remainder.length > MAX_CHUNK_LENGTH) {
      let cut = remainder.lastIndexOf(' ', MAX_CHUNK_LENGTH);
      if (cut <= 0) cut = MAX_CHUNK_LENGTH;
      chunks.push(remainder.slice(0, cut).trim());
      remainder = remainder.slice(cut).trim();
    }
    if (remainder) chunks.push(remainder);
  }

  return chunks.filter(Boolean);
}

// If the text contains Devanagari characters, prefer Hindi voice/lang
// regardless of what the caller asked for (handles Hindi-translated
// responses being spoken correctly).
function resolveSpeechLang(text, requestedLang) {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (hasDevanagari) return 'hi-IN';
  return requestedLang === 'hi-IN' ? 'hi-IN' : 'en-IN';
}

// Encapsulates the Web Speech API usage: speech-to-text (voice search)
// and text-to-speech (audio readout of bot replies).
export function useVoiceRecognition({
  showToast,
  onTranscript,
  onInterimTranscript
}) {
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-IN');

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const submittedRef = useRef(false);

  // ---------------------------------------------------------------
  // SILENCE DETECTION
  // ---------------------------------------------------------------

  const silenceTimerRef = useRef(null);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const startSilenceTimer = () => {
    clearSilenceTimer();

    silenceTimerRef.current = setTimeout(() => {
      console.log('🎤 1 second silence detected. Stopping recognition...');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Recognition may already be stopped.
        }
      }
    }, 1000);
  };

  // ---------------------------------------------------------------
  // LANGUAGE
  // ---------------------------------------------------------------

  const toggleVoiceLang = () => {
    setVoiceLang((prev) =>
      prev === 'en-IN' ? 'hi-IN' : 'en-IN'
    );
  };

  // ---------------------------------------------------------------
  // STOP VOICE
  // ---------------------------------------------------------------

  const stopVoiceRecognition = () => {
    clearSilenceTimer();

    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // Recognition may already be stopped.
      }
    }
  };

  // ---------------------------------------------------------------
  // START / TOGGLE VOICE
  // ---------------------------------------------------------------

  const toggleVoiceRecognition = () => {
    if (isListening) {
      stopVoiceRecognition();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast(
        'Voice recognition is not supported in this browser. Please try Chrome or Edge.'
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = voiceLang;

    finalTranscriptRef.current = '';
    submittedRef.current = false;

    clearSilenceTimer();

    // -------------------------------------------------------------
    // START
    // -------------------------------------------------------------

    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setIsListening(true);
    };

    // -------------------------------------------------------------
    // RESULT
    // -------------------------------------------------------------

    recognition.onresult = (event) => {
      let interim = '';

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result = event.results[i];

        const transcript =
          result?.[0]?.transcript || '';

        if (result.isFinal) {
          finalTranscriptRef.current =
            `${finalTranscriptRef.current} ${transcript}`
              .trim();
        } else {
          interim += transcript;
        }
      }

      const currentText =
        `${finalTranscriptRef.current} ${interim}`
          .trim();

      console.log(
        '🎤 Speech:',
        currentText
      );

      // Show live transcript if supported.
      if (
        typeof onInterimTranscript === 'function'
      ) {
        onInterimTranscript(currentText);
      }

      // -----------------------------------------------------------
      // IMPORTANT
      //
      // Every speech result resets the 1-second silence timer.
      // -----------------------------------------------------------

      if (currentText) {
        startSilenceTimer();
      }
    };

    // -------------------------------------------------------------
    // ERROR
    // -------------------------------------------------------------

    recognition.onerror = (event) => {
      console.log(
        '🎤 Speech recognition error:',
        event.error
      );

      clearSilenceTimer();

      // These are normal browser events.
      if (
        event.error !== 'no-speech' &&
        event.error !== 'aborted'
      ) {
        showToast(
          'Voice error: ' + event.error
        );
      }
    };

    // -------------------------------------------------------------
    // END
    // -------------------------------------------------------------

    recognition.onend = () => {
      console.log(
        '🎤 Voice recognition ended'
      );

      clearSilenceTimer();

      setIsListening(false);

      const finalText =
        finalTranscriptRef.current.trim();

      console.log(
        '📝 Final transcript:',
        finalText
      );

      // -----------------------------------------------------------
      // SEND ONLY ONCE
      // -----------------------------------------------------------

      if (
        finalText &&
        !submittedRef.current
      ) {
        submittedRef.current = true;

        console.log(
          '📤 Sending voice query:',
          finalText
        );

        onTranscript(finalText);
      }

      finalTranscriptRef.current = '';
    };

    recognitionRef.current = recognition;

    // -------------------------------------------------------------
    // START RECOGNITION
    // -------------------------------------------------------------

    try {
      recognition.start();
    } catch (error) {
      clearSilenceTimer();

      setIsListening(false);

      showToast(
        'Unable to start the microphone. Please try again.'
      );
    }
  };

  // ---------------------------------------------------------------
  // BROWSER TEXT TO SPEECH
  // ---------------------------------------------------------------

  const speakWithBrowser = (
    text,
    requestedLang
  ) => {
    if (!('speechSynthesis' in window)) {
      showToast(
        'Audio playback is not supported in this browser.'
      );
      return;
    }

    window.speechSynthesis.cancel();

    const lang =
      resolveSpeechLang(
        text,
        requestedLang
      );

    const chunks =
      splitIntoSpeechChunks(text);

    let index = 0;

    const speakNextChunk = () => {
      if (index >= chunks.length) {
        return;
      }

      const utterance =
        new SpeechSynthesisUtterance(
          chunks[index]
        );

      utterance.lang = lang;
      utterance.rate = 1.0;

      utterance.onend = () => {
        index += 1;
        speakNextChunk();
      };

      utterance.onerror = (event) => {
        if (
          event.error !== 'interrupted' &&
          event.error !== 'canceled'
        ) {
          showToast(
            'Unable to play audio for this response.'
          );
        }
      };

      window.speechSynthesis.speak(
        utterance
      );
    };

    speakNextChunk();
  };

  // ---------------------------------------------------------------
  // TEXT TO SPEECH
  // ---------------------------------------------------------------

  const speakText = async (
    text,
    requestedLang
  ) => {
    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/\*\*/g, '');

    if (!cleanText.trim()) {
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    showToast(
      '🔊 Playing audio readout...'
    );

    try {
      const {
        audioUrl,
        audioBase64,
        mimeType
      } = await textToSpeech({
        text: cleanText
      });

      const src =
        audioUrl ||
        (
          audioBase64
            ? `data:${mimeType};base64,${audioBase64}`
            : null
        );

      if (src) {
        const audio =
          new Audio(src);

        audioRef.current = audio;

        audio.onerror = () => {
          speakWithBrowser(
            cleanText,
            requestedLang
          );
        };

        await audio.play();

        return;
      }
    } catch (error) {
      // Fall back to browser speech synthesis.
    }

    speakWithBrowser(
      cleanText,
      requestedLang
    );
  };

  // ---------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------

  return {
    isListening,
    voiceLang,
    toggleVoiceLang,
    toggleVoiceRecognition,
    stopVoiceRecognition,
    speakText
  };
}
