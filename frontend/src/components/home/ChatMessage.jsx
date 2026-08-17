import React, { useState } from 'react';
import { formattedAiResponse } from '../../utils/formatMessage.jsx';
import { translateText } from '../../services/api.js';
import SchemeMiniCard from './SchemeMiniCard.jsx';

export default function ChatMessage({
  msg,
  onExploreScheme,
  onSpeak
}) {
  const isUser = msg?.role === 'user';

  const [translatedText, setTranslatedText] =
    useState(null);

  const [showTranslation, setShowTranslation] =
    useState(false);

  const [translating, setTranslating] =
    useState(false);

  const [translateError, setTranslateError] =
    useState(null);

  // ============================================================
  // TRANSLATE
  // ============================================================

  const handleTranslate = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    if (translatedText) {
      setShowTranslation(true);
      return;
    }

    const originalText =
      typeof msg?.text === 'string'
        ? msg.text.trim()
        : '';

    if (!originalText) {
      return;
    }

    setTranslating(true);
    setTranslateError(null);

    try {
      console.log(
        '[Chat Translation] Original:',
        originalText
      );

      /*
       * ==========================================================
       * IMPORTANT
       * ==========================================================
       *
       * We want to send the SAME structure that works in Postman.
       *
       * The preferred source is msg.rawResult.
       *
       * normalizeGeminiResponse() now returns:
       *
       * {
       *   replyText,
       *   schemesArray,
       *   rawResult
       * }
       */

      let result = msg?.rawResult;

      /*
       * Fallback for old messages that don't have rawResult.
       *
       * This prevents the app from crashing, but new Gemini
       * responses should contain rawResult.
       */

      if (
        !result ||
        typeof result !== 'object'
      ) {
        result = {
          allowed: true,
          language: 'en',
          query: originalText,
          summary: originalText,

          schemes:
            Array.isArray(
              msg?.matchedSchemes
            )
              ? msg.matchedSchemes
              : [],

          nextQuestionSuggestions: []
        };
      }

      console.log(
        '[Chat Translation] Result being sent:',
        result
      );

      /*
       * This now matches Postman:
       *
       * {
       *   "result": {...},
       *   "targetLanguage": "hi"
       * }
       */

      const response =
        await translateText({
          result,
          targetLanguage: 'hi'
        });

      console.log(
        '[Chat Translation] Normalized response:',
        response
      );

      const translated =
        response?.translatedText;

      if (
        translated !== null &&
        translated !== undefined &&
        String(translated).trim() !== ''
      ) {
        setTranslatedText(
          String(translated)
        );

        setShowTranslation(true);

        console.log(
          '[Chat Translation] SUCCESS:',
          translated
        );
      } else {
        console.error(
          '[Chat Translation] No translated text found:',
          response
        );

        setTranslateError(
          'Translation returned empty text.'
        );
      }
    } catch (error) {
      console.error(
        '[Chat Translation] FAILED:',
        error
      );

      console.error(
        '[Chat Translation] Name:',
        error?.name
      );

      console.error(
        '[Chat Translation] Message:',
        error?.message
      );

      console.error(
        '[Chat Translation] Status:',
        error?.status
      );

      console.error(
        '[Chat Translation] Backend data:',
        error?.data
      );

      setTranslateError(
        error?.message ||
          'Translation failed.'
      );
    } finally {
      setTranslating(false);
    }
  };

  // ============================================================
  // SPEAK
  // ============================================================

  const handleSpeak = () => {
    const text =
      showTranslation &&
      translatedText
        ? translatedText
        : msg?.text || '';

    if (
      typeof text !== 'string' ||
      !text.trim()
    ) {
      return;
    }

    // Speak the translated (Hindi) audio in hi-IN, otherwise en-IN.
    const lang =
      showTranslation && translatedText
        ? 'hi-IN'
        : 'en-IN';

    if (typeof onSpeak === 'function') {
      onSpeak(text, lang);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className={`flex gap-3 items-start ${
        isUser
          ? 'justify-end max-w-[90%] sm:max-w-[85%] ml-auto'
          : 'max-w-[90%] sm:max-w-[85%]'
      }`}
    >
      {/* AI AVATAR */}

      {!isUser && (
        <div
          className="
            w-8 h-8
            rounded-full
            bg-blue-600
            text-white
            flex
            items-center
            justify-center
            text-xs
            shrink-0
            mt-0.5
            shadow-sm
          "
        >
          <i className="fa-solid fa-robot"></i>
        </div>
      )}

      <div
        className={`flex flex-col ${
          isUser ? 'items-end' : ''
        }`}
      >
        {/* MESSAGE BUBBLE */}

        <div
          className={`
            rounded-2xl
            p-4
            text-xs
            sm:text-sm
            leading-relaxed
            shadow-sm

            ${
              isUser
                ? 'bg-blue-600 text-white rounded-tr-none'
                : `bg-slate-50 border ${
                    msg?.isError
                      ? 'border-red-200'
                      : 'border-slate-200'
                  } text-slate-800 rounded-tl-none`
            }
          `}
        >
          {/* ORIGINAL */}

          <div>
            {formattedAiResponse(
              msg?.text || ''
            )}
          </div>

          {/* TRANSLATED */}

          {!isUser &&
            showTranslation &&
            translatedText && (
              <div
                className="
                  mt-3
                  pt-3
                  border-t
                  border-slate-200/60
                "
              >
                <span
                  className="
                    text-[10px]
                    font-bold
                    text-slate-400
                    uppercase
                    tracking-wide
                    block
                    mb-1
                  "
                >
                  Hindi Translation
                </span>

                <div>
                  {formattedAiResponse(
                    translatedText
                  )}
                </div>
              </div>
            )}

          {/* MATCHED SCHEMES */}

          {Array.isArray(
            msg?.matchedSchemes
          ) &&
            msg.matchedSchemes.length > 0 && (
              <div
                className="
                  space-y-3
                  mt-3
                  pt-2
                  border-t
                  border-slate-200/60
                "
              >
                {msg.matchedSchemes.map(
                  (scheme, index) => (
                    <SchemeMiniCard
                      key={
                        scheme?.id ||
                        scheme?.scheme_id ||
                        scheme?.scheme_name ||
                        index
                      }
                      scheme={scheme}
                      onExplore={
                        onExploreScheme
                      }
                    />
                  )
                )}
              </div>
            )}
        </div>

        {/* ACTIONS */}

        <div
          className="
            flex
            items-center
            gap-3
            mt-1.5
            px-1
            text-[11px]
            text-slate-400
            flex-wrap
          "
        >
          {!isUser && (
            <>
              {/* SPEAK */}

              <button
                type="button"
                onClick={handleSpeak}
                disabled={
                  !msg?.text &&
                  !translatedText
                }
                className="
                  hover:text-blue-600
                  flex
                  items-center
                  gap-1
                  font-semibold
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                <i className="fa-solid fa-volume-high"></i>

                {showTranslation &&
                translatedText
                  ? 'Listen Translation'
                  : 'Listen Audio'}
              </button>

              {/* TRANSLATE */}

              <button
                type="button"
                onClick={handleTranslate}
                disabled={
                  translating ||
                  !msg?.text ||
                  String(msg.text).trim() === ''
                }
                className="
                  hover:text-blue-600
                  flex
                  items-center
                  gap-1
                  font-semibold
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                <i
                  className={`fa-solid ${
                    translating
                      ? 'fa-spinner fa-spin'
                      : 'fa-language'
                  }`}
                ></i>

                {translating
                  ? 'Translating...'
                  : showTranslation
                    ? 'Hide Translation'
                    : 'Translate'}
              </button>

              {/* ERROR */}

              {translateError && (
                <span
                  className="text-red-400"
                  title={translateError}
                >
                  Translation failed.
                </span>
              )}
            </>
          )}

          {/* TIME */}

          <span
            className={
              isUser
                ? ''
                : 'ml-auto'
            }
          >
            {msg?.time || ''}
          </span>
        </div>
      </div>
    </div>
  );
}