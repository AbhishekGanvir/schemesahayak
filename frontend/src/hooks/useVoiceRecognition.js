import { useRef, useState } from 'react';
import { textToSpeech } from '../services/api.js';

// ---------------------------------------------------------------------
// TEXT TO SPEECH HELPERS
// ---------------------------------------------------------------------

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

    let remainder = sentence;

    while (remainder.length > MAX_CHUNK_LENGTH) {
      let cut = remainder.lastIndexOf(
        ' ',
        MAX_CHUNK_LENGTH
      );

      if (cut <= 0) {
        cut = MAX_CHUNK_LENGTH;
      }

      chunks.push(
        remainder.slice(0, cut).trim()
      );

      remainder = remainder
        .slice(cut)
        .trim();
    }

    if (remainder) {
      chunks.push(remainder);
    }
  }

  return chunks.filter(Boolean);
}

function resolveSpeechLang(
  text,
  requestedLang
) {
  const hasDevanagari =
    /[\u0900-\u097F]/.test(text);

  if (hasDevanagari) {
    return 'hi-IN';
  }

  return requestedLang === 'hi-IN'
    ? 'hi-IN'
    : 'en-IN';
}

// ---------------------------------------------------------------------
// VOICE RECOGNITION
// ---------------------------------------------------------------------

export function useVoiceRecognition({
  showToast,
  onTranscript,
  onInterimTranscript
}) {
  const [isListening, setIsListening] =
    useState(false);

  const [voiceLang, setVoiceLang] =
    useState('en-IN');

  const recognitionRef =
    useRef(null);

  const audioRef =
    useRef(null);

  // Final text for this recognition session.
  const finalTranscriptRef =
    useRef('');

  // Prevent duplicate submission.
  const submittedRef =
    useRef(false);

  // Prevent duplicate recognition results.
  const lastFinalTranscriptRef =
    useRef('');

  // Keep track of the latest visible transcript.
  const lastInterimTranscriptRef =
    useRef('');

  // Silence timer.
  const silenceTimerRef =
    useRef(null);

  // -------------------------------------------------------------------
  // SILENCE TIMER
  // -------------------------------------------------------------------

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(
        silenceTimerRef.current
      );

      silenceTimerRef.current = null;
    }
  };

  const startSilenceTimer = () => {
    clearSilenceTimer();

    silenceTimerRef.current =
      setTimeout(() => {
        console.log(
          '🎤 Silence detected. Stopping recognition...'
        );

        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (error) {
            // Already stopped.
          }
        }
      }, 1200);
  };

  // -------------------------------------------------------------------
  // LANGUAGE
  // -------------------------------------------------------------------

  const toggleVoiceLang = () => {
    setVoiceLang((prev) =>
      prev === 'en-IN'
        ? 'hi-IN'
        : 'en-IN'
    );
  };

  // -------------------------------------------------------------------
  // STOP
  // -------------------------------------------------------------------

  const stopVoiceRecognition = () => {
    clearSilenceTimer();

    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // Already stopped.
      }
    }
  };

  // -------------------------------------------------------------------
  // START / TOGGLE
  // -------------------------------------------------------------------

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

    const recognition =
      new SpeechRecognition();

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT MOBILE FIX
    |--------------------------------------------------------------------------
    |
    | This is a search query, not continuous dictation.
    |
    | continuous = false prevents Android Chrome from repeatedly
    | replaying previous recognition segments.
    |
    |--------------------------------------------------------------------------
    */

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = voiceLang;

    // Reset session state.
    finalTranscriptRef.current = '';
    submittedRef.current = false;
    lastFinalTranscriptRef.current = '';
    lastInterimTranscriptRef.current = '';

    clearSilenceTimer();

    // -----------------------------------------------------------------
    // START
    // -----------------------------------------------------------------

    recognition.onstart = () => {
      console.log(
        '🎤 Voice recognition started'
      );

      setIsListening(true);
    };

    // -----------------------------------------------------------------
    // RESULT
    // -----------------------------------------------------------------

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT
      |--------------------------------------------------------------------------
      |
      | Instead of blindly appending every result, only use the current
      | recognition result set and deduplicate repeated final text.
      |
      |--------------------------------------------------------------------------
      */

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result =
          event.results[i];

        const transcript =
          result?.[0]?.transcript
            ?.trim() || '';

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          finalText =
            `${finalText} ${transcript}`
              .trim();
        } else {
          interimText =
            `${interimText} ${transcript}`
              .trim();
        }
      }

      /*
      |--------------------------------------------------------------------------
      | FINAL TEXT
      |--------------------------------------------------------------------------
      */

      if (finalText) {
        /*
        |----------------------------------------------------------------------
        | Prevent Android duplicate final events.
        |----------------------------------------------------------------------
        */

        if (
          finalText ===
          lastFinalTranscriptRef.current
        ) {
          console.log(
            '🎤 Duplicate final transcript ignored:',
            finalText
          );

          return;
        }

        lastFinalTranscriptRef.current =
          finalText;

        finalTranscriptRef.current =
          finalText;

        lastInterimTranscriptRef.current =
          '';

        console.log(
          '🎤 Final speech:',
          finalText
        );

        if (
          typeof onInterimTranscript ===
          'function'
        ) {
          onInterimTranscript(
            finalText
          );
        }

        clearSilenceTimer();

        /*
        |--------------------------------------------------------------------------
        | SUBMIT IMMEDIATELY
        |--------------------------------------------------------------------------
        |
        | Since this is a one-shot recognition query, once Android gives us
        | a final transcript we can submit it immediately.
        |
        |--------------------------------------------------------------------------
        */

        if (
          !submittedRef.current
        ) {
          submittedRef.current =
            true;

          console.log(
            '📤 Sending voice query:',
            finalText
          );

          onTranscript(
            finalText
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Stop recognition after final result.
        |--------------------------------------------------------------------------
        */

        try {
          recognition.stop();
        } catch (error) {
          // Already stopping.
        }

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | INTERIM TEXT
      |--------------------------------------------------------------------------
      */

      const currentInterim =
        interimText.trim();

      if (currentInterim) {
        lastInterimTranscriptRef.current =
          currentInterim;

        console.log(
          '🎤 Interim speech:',
          currentInterim
        );

        if (
          typeof onInterimTranscript ===
          'function'
        ) {
          onInterimTranscript(
            currentInterim
          );
        }

        // Reset silence timer while user is speaking.
        startSilenceTimer();
      }
    };

    // -----------------------------------------------------------------
    // ERROR
    // -----------------------------------------------------------------

    recognition.onerror = (event) => {
      console.log(
        '🎤 Speech recognition error:',
        event.error
      );

      clearSilenceTimer();

      setIsListening(false);

      if (
        event.error !== 'no-speech' &&
        event.error !== 'aborted'
      ) {
        showToast(
          'Voice error: ' +
            event.error
        );
      }
    };

    // -----------------------------------------------------------------
    // END
    // -----------------------------------------------------------------

    recognition.onend = () => {
      console.log(
        '🎤 Voice recognition ended'
      );

      clearSilenceTimer();

      setIsListening(false);

      const finalText =
        finalTranscriptRef.current
          .trim();

      /*
      |--------------------------------------------------------------------------
      | FALLBACK SUBMISSION
      |--------------------------------------------------------------------------
      |
      | Usually the final result is already submitted inside onresult.
      | This fallback handles browsers that only deliver the final text
      | immediately before onend.
      |
      |--------------------------------------------------------------------------
      */

      if (
        finalText &&
        !submittedRef.current
      ) {
        submittedRef.current =
          true;

        console.log(
          '📤 Sending voice query from onend:',
          finalText
        );

        onTranscript(
          finalText
        );
      }

      recognitionRef.current = null;

      finalTranscriptRef.current = '';
      lastFinalTranscriptRef.current = '';
      lastInterimTranscriptRef.current = '';
    };

    recognitionRef.current =
      recognition;

    // -----------------------------------------------------------------
    // START
    // -----------------------------------------------------------------

    try {
      recognition.start();
    } catch (error) {
      console.error(
        '🎤 Recognition start failed:',
        error
      );

      clearSilenceTimer();

      setIsListening(false);

      recognitionRef.current =
        null;

      showToast(
        'Unable to start the microphone. Please try again.'
      );
    }
  };

  // ---------------------------------------------------------------------
  // BROWSER TEXT TO SPEECH
  // ---------------------------------------------------------------------

  const speakWithBrowser = (
    text,
    requestedLang
  ) => {
    if (
      !('speechSynthesis' in window)
    ) {
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
      splitIntoSpeechChunks(
        text
      );

    let index = 0;

    const speakNextChunk = () => {
      if (
        index >=
        chunks.length
      ) {
        return;
      }

      const utterance =
        new SpeechSynthesisUtterance(
          chunks[index]
        );

      utterance.lang =
        lang;

      utterance.rate =
        1.0;

      utterance.onend = () => {
        index += 1;
        speakNextChunk();
      };

      utterance.onerror = (
        event
      ) => {
        if (
          event.error !==
            'interrupted' &&
          event.error !==
            'canceled'
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

  // ---------------------------------------------------------------------
  // TEXT TO SPEECH
  // ---------------------------------------------------------------------

  const speakText = async (
    text,
    requestedLang
  ) => {
    const cleanText =
      text
        .replace(
          /<[^>]*>/g,
          ''
        )
        .replace(
          /\*\*/g,
          ''
        );

    if (
      !cleanText.trim()
    ) {
      return;
    }

    if (
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.cancel();
    }

    if (
      audioRef.current
    ) {
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

        audioRef.current =
          audio;

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
      console.warn(
        'TTS backend failed, using browser speech:',
        error
      );
    }

    speakWithBrowser(
      cleanText,
      requestedLang
    );
  };

  // ---------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------

  return {
    isListening,

    voiceLang,

    toggleVoiceLang,

    toggleVoiceRecognition,

    stopVoiceRecognition,

    speakText
  };
}