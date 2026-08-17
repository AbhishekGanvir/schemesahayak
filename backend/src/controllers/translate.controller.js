import { ai } from "../config/gemini.js";

/*
|--------------------------------------------------------------------------
| SUPPORTED LANGUAGES
|--------------------------------------------------------------------------
*/

const LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

/*
|--------------------------------------------------------------------------
| TRANSLATION SYSTEM PROMPT
|--------------------------------------------------------------------------
*/

const TRANSLATION_PROMPT = `
You are the translation engine for Scheme Sahayak,
an Indian Government Scheme discovery platform.

Your task is to translate the HUMAN-READABLE CONTENT of the
provided government scheme result.

SUPPORTED TARGET LANGUAGES:

- en = English
- hi = Hindi
- mr = Marathi

IMPORTANT RULES:

1. Preserve the EXACT JSON structure.

2. NEVER translate or modify JSON keys.

3. NEVER modify:
   - scheme_id
   - URLs
   - numeric values
   - boolean values
   - null values
   - verification values
   - official website URLs

4. Translate human-readable text such as:
   - scheme_name
   - scheme_name_local when appropriate
   - summary
   - category
   - sub_category
   - target_group
   - benefit_type
   - scheme_type
   - state
   - ministry_department
   - government_level
   - benefit descriptions
   - eligibility descriptions
   - conditions
   - exclusions
   - document names
   - application mode
   - application step titles
   - application descriptions
   - payment method
   - FAQ questions
   - FAQ answers
   - tags
   - other human-readable strings

5. Keep official scheme names recognizable.
   Do not invent or rename schemes.

6. Keep government terminology accurate.

7. Do not add information.

8. Do not remove information.

9. Do not invent translations for missing values.
   If a value is null, keep it null.

10. Arrays must remain arrays.

11. Objects must remain objects.

12. Numbers must remain numbers.

13. Booleans must remain booleans.

14. URLs must remain EXACTLY unchanged.

15. Return ONLY valid JSON.

No markdown.
No code fences.
No explanation.

TARGET LANGUAGE:

{{TARGET_LANGUAGE}}

INPUT JSON:

{{INPUT_JSON}}
`;

/*
|--------------------------------------------------------------------------
| TRANSLATE RESULT
|--------------------------------------------------------------------------
*/

export const translateResult = async (req, res) => {
  try {
    const {
      result,
      targetLanguage,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!result) {
      return res.status(400).json({
        success: false,
        error: "Result is required",
      });
    }

    if (
      !targetLanguage ||
      !LANGUAGE_NAMES[targetLanguage]
    ) {
      return res.status(400).json({
        success: false,
        error:
          "targetLanguage must be one of: en, hi, mr",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ALREADY SAME LANGUAGE
    |--------------------------------------------------------------------------
    */

    if (
      result.language ===
      targetLanguage
    ) {
      return res.json({
        success: true,
        data: result,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE PROMPT
    |--------------------------------------------------------------------------
    */

    const prompt =
      TRANSLATION_PROMPT
        .replace(
          "{{TARGET_LANGUAGE}}",
          LANGUAGE_NAMES[targetLanguage]
        )
        .replace(
          "{{INPUT_JSON}}",
          JSON.stringify(result)
        );

    /*
    |--------------------------------------------------------------------------
    | GEMINI
    |--------------------------------------------------------------------------
    */

    const response =
      await ai.models.generateContent({
        model:
          "gemini-3.5-flash-lite",

        contents: [
          {
            role: "user",

            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],

        config: {
          temperature: 0.1,

          topP: 0.8,

          maxOutputTokens: 5000,

          responseMimeType:
            "application/json",
        },
      });

    const text =
      response.text;

    /*
    |--------------------------------------------------------------------------
    | PARSE JSON
    |--------------------------------------------------------------------------
    */

    let translatedData;

    try {
      translatedData =
        JSON.parse(text);
    } catch (error) {
      console.error(
        "Invalid translation JSON:"
      );

      console.error(text);

      return res.status(500).json({
        success: false,
        error:
          "Invalid translation response from AI",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | FORCE LANGUAGE
    |--------------------------------------------------------------------------
    */

    translatedData.language =
      targetLanguage;

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,

      data: translatedData,
    });
  } catch (error) {
    console.error(
      "Translation Error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        "Unable to translate the result right now",
    });
  }
};

/*
|--------------------------------------------------------------------------
| PREPARE RESULT FOR TEXT-TO-SPEECH
|--------------------------------------------------------------------------
|
| This does NOT generate audio.
|
| It creates clean human-readable text.
|
| The future frontend can send this text to:
|
| window.speechSynthesis
|
|--------------------------------------------------------------------------
*/

export const prepareSpeechText = async (
  req,
  res
) => {
  try {
    const {
      result,
    } = req.body;

    if (!result) {
      return res.status(400).json({
        success: false,
        error: "Result is required",
      });
    }

    const language =
      result.language || "en";

    const parts = [];

    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    */

    if (result.summary) {
      parts.push(
        result.summary
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SCHEMES
    |--------------------------------------------------------------------------
    */

    if (
      Array.isArray(
        result.schemes
      )
    ) {
      result.schemes.forEach(
        (scheme, index) => {
          parts.push(
            `Scheme ${index + 1}:`
          );

          if (
            scheme.scheme_name
          ) {
            parts.push(
              scheme.scheme_name
            );
          }

          if (
            scheme.summary
          ) {
            parts.push(
              scheme.summary
            );
          }

          /*
          |--------------------------------------------------------------------------
          | BENEFIT
          |--------------------------------------------------------------------------
          */

          if (
            scheme.benefit
          ) {
            if (
              scheme.benefit
                .description
            ) {
              parts.push(
                `Benefit: ${scheme.benefit.description}`
              );
            }

            if (
              scheme.benefit.amount !==
                null &&
              scheme.benefit.amount !==
                undefined
            ) {
              parts.push(
                `Amount: ${scheme.benefit.amount} ${
                  scheme.benefit.currency ||
                  ""
                }`
              );
            }
          }

          /*
          |--------------------------------------------------------------------------
          | ELIGIBILITY
          |--------------------------------------------------------------------------
          */

          if (
            scheme.eligibility
          ) {
            if (
              Array.isArray(
                scheme.eligibility
                  .conditions
              ) &&
              scheme.eligibility
                .conditions.length
            ) {
              parts.push(
                "Eligibility conditions:"
              );

              scheme.eligibility.conditions.forEach(
                (condition) => {
                  parts.push(
                    String(condition)
                  );
                }
              );
            }
          }

          /*
          |--------------------------------------------------------------------------
          | DOCUMENTS
          |--------------------------------------------------------------------------
          */

          if (
            Array.isArray(
              scheme.documents
            ) &&
            scheme.documents.length
          ) {
            parts.push(
              "Documents required:"
            );

            scheme.documents.forEach(
              (document) => {
                if (
                  typeof document ===
                  "string"
                ) {
                  parts.push(
                    document
                  );
                } else if (
                  document?.document
                ) {
                  parts.push(
                    document.document
                  );
                }
              }
            );
          }

          /*
          |--------------------------------------------------------------------------
          | APPLICATION
          |--------------------------------------------------------------------------
          */

          if (
            scheme.application
          ) {
            if (
              Array.isArray(
                scheme.application
                  .steps
              ) &&
              scheme.application
                .steps.length
            ) {
              parts.push(
                "Application process:"
              );

              scheme.application.steps.forEach(
                (step) => {
                  if (
                    step.title
                  ) {
                    parts.push(
                      step.title
                    );
                  }

                  if (
                    step.description
                  ) {
                    parts.push(
                      step.description
                    );
                  }
                }
              );
            }
          }

          /*
          |--------------------------------------------------------------------------
          | FAQS
          |--------------------------------------------------------------------------
          */

          if (
            Array.isArray(
              scheme.faqs
            ) &&
            scheme.faqs.length
          ) {
            scheme.faqs.forEach(
              (faq) => {
                if (
                  faq.question
                ) {
                  parts.push(
                    faq.question
                  );
                }

                if (
                  faq.answer
                ) {
                  parts.push(
                    faq.answer
                  );
                }
              }
            );
          }
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | FINAL TEXT
    |--------------------------------------------------------------------------
    */

    const speechText =
      parts
        .filter(Boolean)
        .join(". ");

    return res.json({
      success: true,

      data: {
        language,

        text: speechText,
      },
    });
  } catch (error) {
    console.error(
      "Speech text error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        "Unable to prepare speech text",
    });
  }
};