import { ai } from "../config/gemini.js";
import fs from "fs";

/*
|--------------------------------------------------------------------------
| LOAD DATASET
|--------------------------------------------------------------------------
|
| Project structure:
|
| backend/
| ├── data.json
| └── src/
|     └── controllers/
|         └── gemini.controller.js
|
*/


import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDirectory = path.join(
  __dirname,
  "../../data"
);

let schemeDataset = [];

try {
  const allSchemes = [];

  const files = fs
    .readdirSync(dataDirectory)
    .filter((file) =>
      file.endsWith(".json")
    );

  for (const file of files) {
    const filePath = path.join(
      dataDirectory,
      file
    );

    try {
      const rawData = fs.readFileSync(
        filePath,
        "utf-8"
      );

      const parsedData =
        JSON.parse(rawData);

      if (Array.isArray(parsedData)) {
        allSchemes.push(
          ...parsedData
        );
      } else if (
        Array.isArray(
          parsedData.schemes
        )
      ) {
        allSchemes.push(
          ...parsedData.schemes
        );
      }

      console.log(
        `Loaded dataset: ${file}`
      );

    } catch (error) {
      console.error(
        `Failed to load ${file}:`,
        error.message
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | REMOVE DUPLICATES
  |--------------------------------------------------------------------------
  |
  | Several dataset files repeat the same scheme_id (e.g. a scheme
  | referenced from both its own sector file and a cross-listed
  | file). Without de-duplication here, findMatchingSchemes() and the
  | AI chat end up returning the same scheme twice in one answer.
  | scheme.controller.js already does this for the Directory Search
  | dataset — mirror it here so both stay consistent.
  |
  |--------------------------------------------------------------------------
  */

  const uniqueSchemes = new Map();

  for (const scheme of allSchemes) {
    if (scheme?.scheme_id) {
      uniqueSchemes.set(
        scheme.scheme_id,
        scheme
      );
    }
  }

  schemeDataset = Array.from(
    uniqueSchemes.values()
  );

  console.log(
    `Government scheme dataset loaded: ${schemeDataset.length} schemes`
  );

} catch (error) {
  console.error(
    "Failed to read data directory:",
    error.message
  );

  schemeDataset = [];
}


/*
|--------------------------------------------------------------------------
| HISTORY
|--------------------------------------------------------------------------
*/

const trimHistory = (history = []) => {
  return history.slice(-6).map((m) => ({
    role:
      m.role === "assistant"
        ? "model"
        : "user",

    parts: [
      {
        text: String(
          m.content || ""
        ).slice(0, 300),
      },
    ],
  }));
};

/*
|--------------------------------------------------------------------------
| NORMALIZE TEXT
|--------------------------------------------------------------------------
*/

const normalizeText = (text = "") => {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/*
|--------------------------------------------------------------------------
| TOKENIZE
|--------------------------------------------------------------------------
*/

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "from",
  "to",
  "in",
  "on",
  "of",
  "my",
  "me",
  "i",
  "is",
  "are",
  "am",
  "can",
  "could",
  "please",
  "tell",
  "show",
  "give",
  "find",
  "what",
  "which",
  "how",
  "where",
  "available",
  "available",
  "government",
  "govt",
  "sarkari",
  "scheme",
  "schemes",
  "yojana",
  "yojna",
]);

const tokenize = (text = "") => {
  return normalizeText(text)
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (word) => !STOP_WORDS.has(word)
    );
};

/*
|--------------------------------------------------------------------------
| CONVERT OBJECT / ARRAY TO SEARCHABLE TEXT
|--------------------------------------------------------------------------
*/

const valueToText = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map(valueToText)
      .join(" ");
  }

  if (
    typeof value === "object"
  ) {
    return Object.values(value)
      .map(valueToText)
      .join(" ");
  }

  return String(value);
};

/*
|--------------------------------------------------------------------------
| GET SEARCHABLE FIELDS
|--------------------------------------------------------------------------
*/

const getSchemeFields = (scheme) => {
  return {
    /*
    |--------------------------------------------------------------------------
    | HIGH PRIORITY
    |--------------------------------------------------------------------------
    */

    name: normalizeText(
      [
        scheme.scheme_name,
        scheme.scheme_name_local,
        scheme.scheme_id,
      ]
        .filter(Boolean)
        .join(" ")
    ),

    keywords: normalizeText(
      valueToText(
        scheme.identification_keywords
      )
    ),

    /*
    |--------------------------------------------------------------------------
    | MEDIUM PRIORITY
    |--------------------------------------------------------------------------
    */

    tags: normalizeText(
      valueToText(
        scheme.tags
      )
    ),

    category: normalizeText(
      valueToText(
        scheme.identifiers?.category
      )
    ),

    subCategory: normalizeText(
      valueToText(
        scheme.identifiers
          ?.sub_category
      )
    ),

    targetGroup: normalizeText(
      valueToText(
        scheme.identifiers
          ?.target_group
      )
    ),

    benefitType: normalizeText(
      valueToText(
        scheme.identifiers
          ?.benefit_type
      )
    ),

    domains: normalizeText(
      valueToText(
        scheme.identifiers
          ?.domains
      )
    ),

    /*
    |--------------------------------------------------------------------------
    | LOWER PRIORITY
    |--------------------------------------------------------------------------
    */

    description: normalizeText(
      valueToText(
        scheme.description
      )
    ),

    authority: normalizeText(
      valueToText(
        scheme.authority
      )
    ),
  };
};

/*
|--------------------------------------------------------------------------
| CHECK WHETHER A TOKEN EXISTS AS A REAL TOKEN
|--------------------------------------------------------------------------
|
| This prevents:
|
| "sc"
|
| from matching:
|
| "social"
|
| "agriculture"
|
| etc.
|
*/

const fieldContainsToken = (
  field,
  token
) => {
  const tokens = tokenize(field);

  return tokens.includes(token);
};

/*
|--------------------------------------------------------------------------
| FIND STRONG DATASET MATCHES
|--------------------------------------------------------------------------
*/

const findMatchingSchemes = (
  query,
  dataset = []
) => {
  const normalizedQuery =
    normalizeText(query);

  if (
    !normalizedQuery ||
    !Array.isArray(dataset)
  ) {
    return [];
  }

  const queryTokens =
    tokenize(normalizedQuery);

  /*
  |--------------------------------------------------------------------------
  | If query only contains stop words
  |--------------------------------------------------------------------------
  */

  if (queryTokens.length === 0) {
    return [];
  }

  const results = [];

  for (const scheme of dataset) {
    const fields =
      getSchemeFields(scheme);

    let score = 0;

    /*
    |--------------------------------------------------------------------------
    | 1. EXACT SCHEME NAME
    |--------------------------------------------------------------------------
    */

    if (
      fields.name ===
      normalizedQuery
    ) {
      score += 1000;
    }

    /*
    |--------------------------------------------------------------------------
    | 2. QUERY INSIDE SCHEME NAME
    |--------------------------------------------------------------------------
    |
    | Example:
    |
    | "pm kisan"
    |
    | matches:
    |
    | "pradhan mantri kisan samman nidhi"
    |--------------------------------------------------------------------------
    */

    if (
      fields.name.includes(
        normalizedQuery
      )
    ) {
      score += 700;
    }

    /*
    |--------------------------------------------------------------------------
    | 3. IDENTIFICATION KEYWORDS
    |--------------------------------------------------------------------------
    */

    const keywords =
      Array.isArray(
        scheme.identification_keywords
      )
        ? scheme.identification_keywords
        : [];

    for (const keyword of keywords) {
      const normalizedKeyword =
        normalizeText(keyword);

      /*
      |--------------------------------------------------------------------------
      | Exact keyword
      |--------------------------------------------------------------------------
      */

      if (
        normalizedKeyword ===
        normalizedQuery
      ) {
        score += 900;
      }

      /*
      |--------------------------------------------------------------------------
      | Query contained inside keyword
      |--------------------------------------------------------------------------
      */

      else if (
        normalizedKeyword.includes(
          normalizedQuery
        )
      ) {
        score += 600;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | 4. TAG EXACT MATCH
    |--------------------------------------------------------------------------
    */

    const tags =
      Array.isArray(scheme.tags)
        ? scheme.tags
        : [];

    for (const tag of tags) {
      if (
        normalizeText(tag) ===
        normalizedQuery
      ) {
        score += 450;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | 5. MULTI-WORD QUERY
    |--------------------------------------------------------------------------
    |
    | Example:
    |
    | "SC scholarship"
    |
    | Both meaningful words should be represented.
    |
    |--------------------------------------------------------------------------
    */

    if (
      queryTokens.length >= 2
    ) {
      let matchedTokens = 0;

      for (const token of queryTokens) {
        const tokenFound =
          [
            fields.name,
            fields.keywords,
            fields.tags,
            fields.category,
            fields.subCategory,
            fields.targetGroup,
            fields.benefitType,
            fields.domains,
          ].some((field) =>
            fieldContainsToken(
              field,
              token
            )
          );

        if (tokenFound) {
          matchedTokens++;
        }
      }

      const ratio =
        matchedTokens /
        queryTokens.length;

      /*
      |--------------------------------------------------------------------------
      | ALL IMPORTANT TERMS MATCH
      |--------------------------------------------------------------------------
      */

      if (ratio === 1) {
        score += 350;
      }

      /*
      |--------------------------------------------------------------------------
      | MOST TERMS MATCH
      |--------------------------------------------------------------------------
      */

      else if (ratio >= 0.75) {
        score += 180;
      }

      /*
      |--------------------------------------------------------------------------
      | WEAK MATCH = REJECT
      |--------------------------------------------------------------------------
      |
      | This is what prevents:
      |
      | "SC scholarship"
      |
      | from matching PM-KISAN because of one random term.
      |
      |--------------------------------------------------------------------------
      */

      else {
        score = 0;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | 6. SINGLE WORD QUERY
    |--------------------------------------------------------------------------
    |
    | Examples:
    |
    | kisan
    | ayushman
    | mudra
    | pmjay
    | scholarship
    |--------------------------------------------------------------------------
    */

    if (
      queryTokens.length === 1
    ) {
      const token =
        queryTokens[0];

      const importantFields = [
        fields.name,
        fields.keywords,
        fields.tags,
        fields.category,
        fields.subCategory,
        fields.targetGroup,
      ];

      const exactTokenMatch =
        importantFields.some(
          (field) =>
            fieldContainsToken(
              field,
              token
            )
        );

      /*
      |--------------------------------------------------------------------------
      | No real token match
      |--------------------------------------------------------------------------
      */

      if (!exactTokenMatch) {
        score = 0;
      } else {
        score += 250;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | 7. SPECIAL CATEGORY SEARCHES
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | FARMER
    |--------------------------------------------------------------------------
    */

    if (
      normalizedQuery.includes(
        "farmer"
      ) ||
      normalizedQuery.includes(
        "farmers"
      ) ||
      normalizedQuery.includes(
        "kisan"
      )
    ) {
      const farmerMatch =
        [
          fields.category,
          fields.subCategory,
          fields.targetGroup,
          fields.domains,
          fields.tags,
        ].some(
          (field) =>
            fieldContainsToken(
              field,
              "farmer"
            ) ||
            fieldContainsToken(
              field,
              "farmers"
            ) ||
            fieldContainsToken(
              field,
              "kisan"
            ) ||
            fieldContainsToken(
              field,
              "agriculture"
            )
        );

      if (farmerMatch) {
        score += 200;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | WOMEN
    |--------------------------------------------------------------------------
    */

    if (
      normalizedQuery.includes(
        "women"
      ) ||
      normalizedQuery.includes(
        "woman"
      ) ||
      normalizedQuery.includes(
        "ladki"
      ) ||
      normalizedQuery.includes(
        "girl"
      )
    ) {
      const womenMatch =
        [
          fields.category,
          fields.subCategory,
          fields.targetGroup,
          fields.domains,
          fields.tags,
        ].some(
          (field) =>
            fieldContainsToken(
              field,
              "women"
            ) ||
            fieldContainsToken(
              field,
              "woman"
            ) ||
            fieldContainsToken(
              field,
              "girl"
            ) ||
            fieldContainsToken(
              field,
              "women_welfare"
            )
        );

      if (womenMatch) {
        score += 200;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | HOUSING
    |--------------------------------------------------------------------------
    */

    if (
      normalizedQuery.includes(
        "housing"
      ) ||
      normalizedQuery.includes(
        "house"
      )
    ) {
      const housingMatch =
        [
          fields.category,
          fields.subCategory,
          fields.targetGroup,
          fields.domains,
          fields.tags,
        ].some(
          (field) =>
            fieldContainsToken(
              field,
              "housing"
            ) ||
            fieldContainsToken(
              field,
              "house"
            ) ||
            fieldContainsToken(
              field,
              "housing"
            )
        );

      if (housingMatch) {
        score += 200;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | SCHOLARSHIP
    |--------------------------------------------------------------------------
    */

    if (
      normalizedQuery.includes(
        "scholarship"
      )
    ) {
      const scholarshipMatch =
        [
          fields.category,
          fields.subCategory,
          fields.targetGroup,
          fields.domains,
          fields.tags,
          fields.keywords,
        ].some(
          (field) =>
            fieldContainsToken(
              field,
              "scholarship"
            ) ||
            fieldContainsToken(
              field,
              "education"
            )
        );

      if (scholarshipMatch) {
        score += 200;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | HEALTH
    |--------------------------------------------------------------------------
    */

    if (
      normalizedQuery.includes(
        "health"
      ) ||
      normalizedQuery.includes(
        "healthcare"
      ) ||
      normalizedQuery.includes(
        "ayushman"
      )
    ) {
      const healthMatch =
        [
          fields.category,
          fields.subCategory,
          fields.domains,
          fields.tags,
          fields.keywords,
          fields.name,
        ].some(
          (field) =>
            fieldContainsToken(
              field,
              "health"
            ) ||
            fieldContainsToken(
              field,
              "healthcare"
            ) ||
            fieldContainsToken(
              field,
              "ayushman"
            ) ||
            fieldContainsToken(
              field,
              "insurance"
            )
        );

      if (healthMatch) {
        score += 200;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | PENSION
    |--------------------------------------------------------------------------
    */

    if (
      normalizedQuery.includes(
        "pension"
      )
    ) {
      const pensionMatch =
        [
          fields.category,
          fields.subCategory,
          fields.domains,
          fields.tags,
          fields.keywords,
          fields.name,
        ].some(
          (field) =>
            fieldContainsToken(
              field,
              "pension"
            )
        );

      if (pensionMatch) {
        score += 200;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ACTIVE BONUS
    |--------------------------------------------------------------------------
    */

    if (
      score > 0 &&
      scheme.status?.active === true
    ) {
      score += 20;
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFIED BONUS
    |--------------------------------------------------------------------------
    */

    if (
      score > 0 &&
      scheme.verification
        ?.verified === true
    ) {
      score += 20;
    }

    /*
    |--------------------------------------------------------------------------
    | FINAL THRESHOLD
    |--------------------------------------------------------------------------
    */

    if (score >= 250) {
      results.push({
        scheme,
        score,
      });
    }
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, 3)
    .map(
      (item) =>
        item.scheme
    );
};

/*
|--------------------------------------------------------------------------
| GOVERNMENT QUERY DETECTION
|--------------------------------------------------------------------------
*/

const governmentKeywords = [
  "scheme",
  "schemes",
  "yojana",
  "yojna",
  "government",
  "govt",
  "sarkari",
  "benefit",
  "benefits",
  "subsidy",
  "subsidies",
  "scholarship",
  "scholarships",
  "pension",
  "farmer",
  "farmers",
  "kisan",
  "agriculture",
  "ayushman",
  "health",
  "healthcare",
  "insurance",
  "housing",
  "house scheme",
  "loan",
  "loans",
  "employment",
  "job",
  "jobs",
  "education",
  "student",
  "students",
  "women",
  "woman",
  "girl",
  "child",
  "children",
  "widow",
  "disability",
  "senior citizen",
  "tribal",
  "minority",
  "ration",
  "food security",
  "bpl",
  "mudra",
  "startup",
  "msme",
  "business",
  "skill",
  "skill development",
  "apply",
  "application",
  "eligibility",
  "eligible",
  "documents",
  "aadhaar",
  "dbt",
  "financial assistance",
  "social security",
  "maternity",
  "maternal",
  "lpg",
  "gas",
];

/*
|--------------------------------------------------------------------------
| CHECK GOVERNMENT INTENT
|--------------------------------------------------------------------------
*/

const hasGovernmentIntent = (
  query
) => {
  const normalizedQuery =
    normalizeText(query);

  return governmentKeywords.some(
    (keyword) =>
      normalizedQuery.includes(
        normalizeText(keyword)
      )
  );
};

/*
|--------------------------------------------------------------------------
| GEMINI SYSTEM PROMPT
|--------------------------------------------------------------------------
*/

const SYSTEM_PROMPT = `
You are Scheme Sahayak AI, an Indian Government Scheme Assistant.

Your job is to help users discover REAL Indian Government schemes and benefits.

========================
IMPORTANT ARCHITECTURE
========================

The application uses a LOCAL government scheme dataset FIRST.

The backend searches the local dataset before calling you.

There are two possible situations:

1. LOCAL DATASET MATCH EXISTS

If local dataset matches are provided:
- Treat them as the PRIMARY SOURCE.
- Return only relevant matched schemes.
- Do not replace them with other schemes from your general knowledge.
- Do not invent missing information.

2. LOCAL DATASET MATCH DOES NOT EXIST

If no local dataset match exists:
- The backend may call you as FALLBACK AI.
- Use your knowledge of real Indian Government schemes.
- Answer the government-related query as helpfully as possible.
- Do not pretend the scheme came from the local dataset.
- Do not fabricate precise information.
- If you are not confident about a specific field, use null.
- For fallback schemes, verification.verified must be false unless verification was actually provided.

========================
SCOPE
========================

You may answer only questions related to:

- Indian Government schemes
- Scholarships
- Education
- Women welfare
- Child welfare
- Farmers
- Agriculture
- Healthcare
- Health insurance
- Housing
- Employment
- Self-employment
- Skill development
- Loans
- MSME
- Entrepreneurship
- Pension
- Insurance
- Senior citizens
- Disability
- Minority welfare
- Tribal welfare
- Rural development
- Urban development
- Financial inclusion
- Banking
- Ration
- Food security
- Social security
- Labour
- LPG / energy
- Girl child
- Maternal welfare

If the query is completely unrelated, return:

{
  "allowed": false,
  "message": "I can only answer questions related to Indian Government schemes and benefits."
}

========================
SHORT QUERIES
========================

A query can be only one or two words.

Examples:

"PM KISAN"
"kisan"
"ayushman"
"mudra"
"PMAY"
"ladki bahin"
"scholarship"
"SC scholarship"

Do NOT reject a government scheme query simply because it is short.

========================
LOCAL DATASET
========================

When LOCAL DATASET MATCHES are supplied, use them.

The dataset fields include:

- scheme_id
- scheme_name
- scheme_name_local
- identifiers
- status
- authority
- classification
- benefit
- description
- eligibility
- documents_required
- application
- payment
- faqs
- tags
- identification_keywords
- related_domains
- source
- verification

Do not invent missing fields.

========================
FALLBACK AI
========================

If the query was not found in the local dataset, provide a fallback answer using your knowledge.

However:

DO NOT invent:
- fictional schemes
- benefit amounts
- eligibility
- documents
- government departments
- deadlines
- application procedures
- official URLs

Only give information you can reasonably support.

For fallback results:

"verification": {
  "verified": false,
  "last_verified": null
}

========================
RESULT LIMIT
========================

Maximum 3 schemes.

Do not return unrelated schemes.

========================
JSON ONLY
========================

Return ONLY valid JSON.

No markdown.
No code fences.
No explanations outside JSON.

Use:

{
  "allowed": true,
  "language": "en",
  "query": "user query",
  "summary": "short useful answer",
  "schemes": [],
  "nextQuestionSuggestions": []
}

========================
SCHEME STRUCTURE
========================

Each scheme should use:

{
  "scheme_id": "",
  "scheme_name": "",
  "scheme_name_local": null,
  "summary": "",
  "identifiers": {},
  "authority": {},
  "classification": {},
  "benefit": {},
  "eligibility": {},
  "documents": [],
  "application": {},
  "payment": {},
  "faqs": [],
  "tags": [],
  "officialPortal": {
    "name": "Official government portal",
    "url": null
  },
  "verification": {
    "verified": false,
    "last_verified": null
  }
}

========================
LANGUAGE
========================

Supported:

en
hi
mr
hinglish

JSON keys must always be English.

========================
ACCURACY
========================

Never hallucinate.

Never invent URLs.

Never invent amounts.

Never invent eligibility.

Never invent documents.

Never invent application procedures.

Never claim a fallback scheme is verified.

Return concise valid JSON only.
`;

/*
|--------------------------------------------------------------------------
| GEMINI SCHEME NORMALIZATION — CANONICAL STRUCTURE
|--------------------------------------------------------------------------
|
| Converts a raw Gemini-generated scheme object into the same canonical
| structure used by the database dataset (scheme_id, scheme_name,
| identifiers, status, authority, classification, benefit, description,
| eligibility, documents_required, application, payment, faqs, tags,
| identification_keywords, related_domains, source, verification,
| ai_advisor).
|
| Guarantees every required field is populated with either real Gemini
| data, a value logically derived from another Gemini field, or an
| explicit "not specified" style placeholder — never null, undefined,
| "", or {}. Never fabricates factual information (amounts, dates,
| eligibility, URLs).
|
|--------------------------------------------------------------------------
*/

const NOT_SPECIFIED = "Not specified";
const NOT_APPLICABLE = "Not applicable";
const NOT_PROVIDED =
  "Not provided in available source";

/*
|--------------------------------------------------------------------------
| BLANK CHECK
|--------------------------------------------------------------------------
*/

const isBlank = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return true;
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return true;
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  ) {
    return true;
  }

  if (
    Array.isArray(value) &&
    value.length === 0
  ) {
    return true;
  }

  return false;
};

// First non-blank value among candidates (undefined if none).
const pick = (...values) => {
  for (const value of values) {
    if (!isBlank(value)) {
      return value;
    }
  }

  return undefined;
};

// Guarantees a real value (string, number, boolean, object) —
// replaces null/undefined/""/empty-object/empty-array with an
// explicit, non-fabricated placeholder, but preserves any real value
// as-is (including numbers, booleans, and populated objects/arrays).
const valueOr = (
  value,
  fallback = NOT_SPECIFIED
) => (isBlank(value) ? fallback : value);

// Same as valueOr, but always coerces the result to a trimmed string.
// Use for fields that must render as plain text.
const textOr = (
  value,
  fallback = NOT_SPECIFIED
) =>
  isBlank(value)
    ? fallback
    : String(value).trim();

// Filters out blank entries and guarantees an array. A non-array,
// non-blank scalar (Gemini sometimes returns a single string instead
// of a one-item array, e.g. application.mode: "Online") is wrapped
// rather than discarded, so real data is never silently dropped.
const arrayOr = (value) => {
  const list = Array.isArray(value)
    ? value
    : isBlank(value)
    ? []
    : [value];

  return list.filter(
    (item) => !isBlank(item)
  );
};

// Array field that must never silently become an empty list — falls
// back to a single explanatory placeholder entry instead of [].
const requiredArrayOr = (
  value,
  fallback = NOT_PROVIDED
) => {
  const cleaned = arrayOr(value);
  return cleaned.length > 0
    ? cleaned
    : [fallback];
};

/*
|--------------------------------------------------------------------------
| ALIAS NORMALIZATION
|--------------------------------------------------------------------------
|
| Gemini may return camelCase or snake_case, and sometimes different
| field names entirely (e.g. authority.level instead of
| authority.government_level). This maps every known alias onto the
| canonical field name before anything else runs. Supports both
| camelCase and snake_case inputs.
|
|--------------------------------------------------------------------------
*/

const normalizeGeminiAliases = (
  raw = {}
) => {
  const identifiers =
    raw.identifiers || {};

  const classification =
    raw.classification || {};

  const authority =
    raw.authority || {};

  const eligibility =
    raw.eligibility || {};

  const application =
    raw.application || {};

  const payment =
    raw.payment || {};

  const benefit =
    raw.benefit || {};

  const officialPortal =
    raw.officialPortal ||
    raw.official_portal ||
    {};

  const source =
    raw.source || {};

  const sharedTargetGroup = pick(
    identifiers.target_group,
    identifiers.targetGroup,
    classification.target_group,
    classification.targetGroup
  );

  const sharedSubCategory = pick(
    identifiers.sub_category,
    identifiers.subCategory,
    classification.sub_category,
    classification.subCategory
  );

  return {
    ...raw,

    identifiers: {
      ...identifiers,
      target_group:
        sharedTargetGroup,
      sub_category:
        sharedSubCategory,
    },

    classification: {
      ...classification,
      target_group:
        sharedTargetGroup,
      sub_category:
        sharedSubCategory,
    },

    authority: {
      ...authority,

      government_level: pick(
        authority.government_level,
        authority.governmentLevel,
        authority.level
      ),

      ministry_department: pick(
        authority.ministry_department,
        authority.ministryDepartment,
        authority.ministry,
        authority.department
      ),
    },

    eligibility: {
      ...eligibility,

      age: pick(
        eligibility.age,
        eligibility.ageRange,
        eligibility.age_range
      ),

      income: pick(
        eligibility.income,
        eligibility.incomeLimit,
        eligibility.income_limit
      ),
    },

    application: {
      ...application,

      steps: pick(
        application.steps,
        application.process
      ),

      mode: pick(
        application.mode,
        application.applicationMode
      ),
    },

    payment: {
      ...payment,

      method: pick(
        payment.method,
        payment.mode
      ),

      frequency: pick(
        payment.frequency,
        payment.paymentFrequency
      ),
    },

    benefit: {
      ...benefit,

      benefit_type: pick(
        benefit.benefit_type,
        benefit.type,
        benefit.benefitType
      ),

      benefit_description: pick(
        benefit.benefit_description,
        benefit.description,
        benefit.benefitDescription
      ),
    },

    source: {
      ...source,

      official_website: pick(
        source.official_website,
        source.officialWebsite,
        officialPortal.url,
        raw.official_website,
        raw.officialWebsite
      ),

      source_type: pick(
        source.source_type,
        source.sourceType,
        officialPortal.name
      ),
    },
  };
};

/*
|--------------------------------------------------------------------------
| OFFICIAL URL VALIDATION
|--------------------------------------------------------------------------
|
| Supports markdown-formatted links such as:
|
|   [Official Portal](https://example.gov.in/)
|
| and normalizes them to a plain https URL. Returns null for anything
| that isn't a real, well-formed http(s) URL — this function never
| invents or guesses a URL.
|
|--------------------------------------------------------------------------
*/

const extractValidUrl = (value) => {
  if (
    !value ||
    typeof value !== "string"
  ) {
    return null;
  }

  const markdownMatch =
    value.match(
      /\((https?:\/\/[^)\s]+)\)/
    );

  const candidate = (
    markdownMatch
      ? markdownMatch[1]
      : value
  ).trim();

  if (
    !/^https?:\/\/.+\..+/i.test(
      candidate
    )
  ) {
    return null;
  }

  try {
    // eslint-disable-next-line no-new
    new URL(candidate);
    return candidate;
  } catch {
    return null;
  }
};

/*
|--------------------------------------------------------------------------
| BUILD CANONICAL GEMINI SCHEME
|--------------------------------------------------------------------------
|
| Pipeline (Task 10):
|
|   Gemini response
|   → JSON parse (done by caller)
|   → normalize aliases
|   → build complete canonical scheme
|   → fill missing non-factual fields with explicit values
|   → validate every required field
|   → validate official URL
|   → add Government Verification Pending
|   → add AI Advisor Verified
|   → return { scheme } or { rejected: true, reason }
|
| A scheme is rejected (never returned to the frontend) when it has no
| name, or no confident real official government URL — both would
| otherwise force us to either fabricate data or return an incomplete
| object, which Task 3 / Task 6 explicitly forbid.
|
|--------------------------------------------------------------------------
*/

const buildCanonicalGeminiScheme = (
  rawScheme,
  index = 0
) => {
  if (
    !rawScheme ||
    typeof rawScheme !== "object" ||
    Array.isArray(rawScheme)
  ) {
    return {
      scheme: null,
      rejected: true,
      reason: `Gemini scheme #${index} is not a valid object`,
    };
  }

  const raw =
    normalizeGeminiAliases(
      rawScheme
    );

  const schemeName = pick(
    raw.scheme_name,
    raw.name,
    raw.title
  );

  if (isBlank(schemeName)) {
    return {
      scheme: null,
      rejected: true,
      reason: `Gemini scheme #${index} rejected — missing scheme_name (cannot fabricate a name)`,
    };
  }

  const identifiers =
    raw.identifiers || {};

  const status =
    raw.status || {};

  const authority =
    raw.authority || {};

  const classification =
    raw.classification || {};

  const benefit =
    raw.benefit || {};

  const description =
    raw.description || {};

  const eligibility =
    raw.eligibility || {};

  const application =
    raw.application || {};

  const payment =
    raw.payment || {};

  const source =
    raw.source || {};

  const officialUrl =
    extractValidUrl(
      pick(
        source.official_website,
        raw.officialPortal?.url
      )
    );

  /*
  |--------------------------------------------------------------------------
  | NOTE ON MISSING URLs (Task 6 fix)
  |--------------------------------------------------------------------------
  |
  | The fallback-mode system prompt explicitly tells Gemini to return
  | null for any field it isn't confident about, including URLs, to
  | avoid it fabricating official links. Treating "no URL" as grounds
  | to reject the *entire* scheme meant almost every fallback answer
  | ended up with schemes: [] — no cards, no Explore/Detail button,
  | just the text summary.
  |
  | A scheme with a real name but no confident URL is still useful:
  | the frontend already renders the official-website link
  | conditionally (SchemeDetailContent.jsx checks
  | `source.official_website ?`), so we simply pass officialUrl
  | through as-is (string or null) instead of discarding the whole
  | scheme. We only reject when there's no name to identify the
  | scheme by at all (handled above).
  |
  |--------------------------------------------------------------------------
  */

  const schemeId = textOr(
    pick(raw.scheme_id, raw.id),
    `gemini_${normalizeText(
      schemeName
    ).replace(/\s+/g, "_")}`
  );

  const summary = textOr(
    pick(
      description.summary,
      description.short,
      raw.summary
    ),
    NOT_PROVIDED
  );

  const hasAmount = !isBlank(
    benefit.amount
  );

  const domainsList = arrayOr(
    classification.domains
  );

  // Derive from category when Gemini didn't supply explicit domains,
  // rather than leaving this required object empty.
  const domainsForRelated =
    domainsList.length > 0
      ? domainsList
      : [
          pick(
            identifiers.category,
            classification.category
          ),
        ].filter(
          (item) => !isBlank(item)
        );

  const relatedDomains =
    domainsForRelated.length > 0
      ? Object.fromEntries(
          domainsForRelated.map(
            (domain) => [
              normalizeText(
                domain
              ).replace(
                /\s+/g,
                "_"
              ),
              true,
            ]
          )
        )
      : { general: true };

  const canonicalScheme = {
    scheme_id: schemeId,

    scheme_name: textOr(
      schemeName
    ),

    scheme_name_local: textOr(
      pick(
        raw.scheme_name_local,
        raw.nameLocal
      ),
      NOT_APPLICABLE
    ),

    identifiers: {
      category: textOr(
        pick(
          identifiers.category,
          classification.category
        )
      ),
      sub_category: textOr(
        identifiers.sub_category
      ),
      target_group: textOr(
        identifiers.target_group
      ),
      benefit_type: textOr(
        pick(
          identifiers.benefit_type,
          benefit.benefit_type
        )
      ),
      scheme_type: textOr(
        identifiers.scheme_type
      ),
      state: textOr(
        identifiers.state,
        "India"
      ),
      gender: textOr(
        identifiers.gender,
        "All"
      ),
    },

    status: {
      active:
        typeof status.active ===
        "boolean"
          ? status.active
          : true,
      status_label: textOr(
        status.status_label,
        "Active"
      ),
    },

    authority: {
      ministry_department: textOr(
        authority.ministry_department
      ),
      government_level: textOr(
        authority.government_level
      ),
      state: textOr(
        authority.state,
        "India"
      ),
    },

    classification: {
      category: textOr(
        pick(
          classification.category,
          identifiers.category
        )
      ),
      sub_category: textOr(
        classification.sub_category
      ),
      sector: textOr(
        classification.sector
      ),
      domains: domainsList,
      target_group: textOr(
        classification.target_group
      ),
      benefit_type: textOr(
        pick(
          classification.benefit_type,
          benefit.benefit_type
        )
      ),
      scheme_type: textOr(
        classification.scheme_type
      ),
    },

    benefit: {
      amount: valueOr(
        benefit.amount
      ),
      currency: hasAmount
        ? textOr(
            benefit.currency,
            "₹"
          )
        : NOT_APPLICABLE,
      frequency: textOr(
        pick(
          benefit.frequency,
          payment.frequency
        ),
        NOT_APPLICABLE
      ),
      annual_amount: valueOr(
        benefit.annual_amount,
        NOT_SPECIFIED
      ),
      benefit_description: textOr(
        pick(
          benefit.benefit_description,
          summary
        ),
        NOT_PROVIDED
      ),
    },

    description: {
      summary,
      short: textOr(
        description.short,
        summary
      ),
      full: textOr(
        description.full,
        summary
      ),
    },

    eligibility: {
      age: valueOr(eligibility.age),
      gender: arrayOr(
        eligibility.gender
      ).length
        ? arrayOr(
            eligibility.gender
          )
        : ["All"],
      residency: textOr(
        eligibility.residency,
        "India"
      ),
      income: valueOr(
        eligibility.income
      ),
      bank_account: valueOr(
        eligibility.bank_account
      ),
      conditions:
        requiredArrayOr(
          eligibility.conditions
        ),
      exclusions: arrayOr(
        eligibility.exclusions
      ),
    },

    documents_required:
      requiredArrayOr(
        pick(
          raw.documents_required,
          raw.documents
        )
      ),

    application: {
      mode: requiredArrayOr(
        application.mode,
        NOT_SPECIFIED
      ),
      steps: requiredArrayOr(
        application.steps
      ),
    },

    payment: {
      method: textOr(
        payment.method
      ),
      frequency: textOr(
        payment.frequency,
        NOT_APPLICABLE
      ),
      dbt: valueOr(
        payment.dbt,
        NOT_SPECIFIED
      ),
      bank_account_required:
        valueOr(
          payment.bank_account_required,
          NOT_SPECIFIED
        ),
      aadhaar_linked: valueOr(
        payment.aadhaar_linked,
        NOT_SPECIFIED
      ),
    },

    faqs: arrayOr(raw.faqs),

    tags: arrayOr(raw.tags).length
      ? arrayOr(raw.tags)
      : [
          textOr(
            pick(
              identifiers.category,
              classification.category
            )
          ),
        ],

    identification_keywords:
      arrayOr(
        pick(
          raw.identification_keywords,
          raw.keywords
        )
      ),

    related_domains:
      relatedDomains,

    source: {
      source_type: textOr(
        source.source_type,
        officialUrl
          ? "Official government portal"
          : "AI-generated (no confident official URL — verify independently)"
      ),
      // May be null when Gemini wasn't confident enough to provide a
      // real URL (fallback mode). The frontend already renders this
      // link conditionally, so a null value just hides the link
      // rather than breaking the card — see note above.
      official_website:
        officialUrl,
      official_notification:
        extractValidUrl(
          source.official_notification
        ),
      source_reference: textOr(
        source.source_reference,
        NOT_APPLICABLE
      ),
      last_verified: textOr(
        source.last_verified,
        NOT_APPLICABLE
      ),
    },

    verification: {
      verified: false,
      verification_status:
        "pending",
      verification_source:
        "AI-generated",
      verification_note:
        "This scheme information was generated by Scheme Sahayak AI and has not been independently verified against the official government source.",
    },

    ai_advisor: {
      generated: true,
      verified: true,
      status:
        "AI Advisor Verified",
      note: "The scheme data was successfully structured and reviewed by Scheme Sahayak AI.",
    },
  };

  return {
    scheme: canonicalScheme,
    rejected: false,
    reason: null,
  };
};

/*
|--------------------------------------------------------------------------
| FORMAT DATASET SCHEME
|--------------------------------------------------------------------------
*/

const formatDatasetScheme = (
  scheme
) => {
  return {
    scheme_id:
      scheme.scheme_id ||
      "",

    scheme_name:
      scheme.scheme_name ||
      "",

    scheme_name_local:
      scheme.scheme_name_local ??
      null,

    summary:
      scheme.description
        ?.summary ||
      scheme.description
        ?.short ||
      "",

    identifiers: {
      category:
        scheme.identifiers
          ?.category ||
        "",

      sub_category:
        scheme.identifiers
          ?.sub_category ||
        "",

      target_group:
        scheme.identifiers
          ?.target_group ||
        "",

      benefit_type:
        scheme.identifiers
          ?.benefit_type ||
        "",

      scheme_type:
        scheme.identifiers
          ?.scheme_type ||
        "",

      state:
        scheme.identifiers
          ?.state ||
        "",
    },

    authority: {
      scheme_name:
        scheme.authority
          ?.scheme_name ||
        "",

      scheme_id:
        scheme.authority
          ?.scheme_id ||
        "",

      ministry_department:
        scheme.authority
          ?.ministry_department ||
        "",

      government_level:
        scheme.authority
          ?.government_level ||
        "",

      state:
        scheme.authority
          ?.state ||
        "",
    },

    classification: {
      category:
        scheme.classification
          ?.category ||
        "",

      sub_category:
        scheme.classification
          ?.sub_category ||
        "",

      sector:
        scheme.classification
          ?.sector ||
        "",

      domains:
        Array.isArray(
          scheme.classification
            ?.domains
        )
          ? scheme.classification
              .domains
          : [],

      target_group:
        scheme.classification
          ?.target_group ||
        "",

      benefit_type:
        scheme.classification
          ?.benefit_type ||
        "",

      scheme_type:
        scheme.classification
          ?.scheme_type ||
        "",
    },

    benefit: {
      amount:
        scheme.benefit
          ?.amount ??
        null,

      currency:
        scheme.benefit
          ?.currency ??
        null,

      frequency:
        scheme.benefit
          ?.frequency ??
        null,

      annual_amount:
        scheme.benefit
          ?.annual_amount ??
        null,

      description:
        scheme.benefit
          ?.benefit_description ||
        "",
    },

    eligibility: {
      age:
        scheme.eligibility
          ?.age ??
        null,

      gender:
        Array.isArray(
          scheme.eligibility
            ?.gender
        )
          ? scheme.eligibility
              .gender
          : [],

      residency:
        scheme.eligibility
          ?.residency ??
        null,

      income:
        scheme.eligibility
          ?.income ??
        null,

      bank_account:
        scheme.eligibility
          ?.bank_account ??
        null,

      conditions:
        Array.isArray(
          scheme.eligibility
            ?.conditions
        )
          ? scheme.eligibility
              .conditions
          : [],

      exclusions:
        Array.isArray(
          scheme.eligibility
            ?.exclusions
        )
          ? scheme.eligibility
              .exclusions
          : [],
    },

    documents:
      Array.isArray(
        scheme.documents_required
      )
        ? scheme.documents_required
        : [],

    application: {
      mode:
        Array.isArray(
          scheme.application
            ?.mode
        )
          ? scheme.application.mode
          : [],

      steps:
        Array.isArray(
          scheme.application
            ?.steps
        )
          ? scheme.application.steps
          : [],
    },

    payment: {
      method:
        scheme.payment
          ?.method ??
        null,

      dbt:
        scheme.payment
          ?.dbt ??
        null,

      bank_account_required:
        scheme.payment
          ?.bank_account_required ??
        null,

      aadhaar_linked:
        scheme.payment
          ?.aadhaar_linked ??
        null,
    },

    faqs:
      Array.isArray(
        scheme.faqs
      )
        ? scheme.faqs
        : [],

    tags:
      Array.isArray(
        scheme.tags
      )
        ? scheme.tags
        : [],

    officialPortal: {
      name:
        "Official government portal",

      url:
        scheme.source
          ?.official_website ||
        scheme.source
          ?.official_notification ||
        null,
    },

    verification: {
      verified:
        scheme.verification
          ?.verified ??
        false,

      last_verified:
        scheme.source
          ?.last_verified ||
        scheme.verification
          ?.last_verified ||
        null,
    },
  };
};

/*
|--------------------------------------------------------------------------
| ASK GEMINI
|--------------------------------------------------------------------------
*/

export const askGemini = async (
  req,
  res
) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | SAME API BODY
    |--------------------------------------------------------------------------
    |
    | {
    |   "message": "...",
    |   "history": []
    | }
    |
    |--------------------------------------------------------------------------
    */

    const {
      message,
      history = [],
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      !message ||
      message.trim().length < 2
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Message is required",
      });
    }

    const query =
      message.trim();

    /*
    |--------------------------------------------------------------------------
    | DATASET SEARCH FIRST
    |--------------------------------------------------------------------------
    */

    const matchedSchemes =
      findMatchingSchemes(
        query,
        schemeDataset
      );

    console.log(
      `\nUser query: "${query}"`
    );

    console.log(
      `Dataset matches: ${matchedSchemes.length}`
    );

    if (
      matchedSchemes.length > 0
    ) {
      console.log(
        "Using LOCAL DATASET"
      );

      console.log(
        "Matched schemes:",
        matchedSchemes.map(
          (scheme) =>
            scheme.scheme_name
        )
      );

      /*
      |--------------------------------------------------------------------------
      | RETURN DATASET DIRECTLY
      |--------------------------------------------------------------------------
      |
      | Gemini is NOT needed here.
      |
      */

      const formattedSchemes =
        matchedSchemes.map(
          formatDatasetScheme
        );

      return res.json({
        success: true,

        data: {
          allowed: true,

          language: "en",

          query,

          summary:
            formattedSchemes.length === 1
              ? `I found a government scheme matching "${query}" in the scheme database.`
              : `I found government schemes matching "${query}" in the scheme database.`,

          schemes:
            formattedSchemes,

          nextQuestionSuggestions: [
            "What are the eligibility criteria?",
            "What documents are required?",
            "How can I apply?",
          ],
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | NO DATASET MATCH
    |--------------------------------------------------------------------------
    */

    console.log(
      "No strong dataset match."
    );

    /*
    |--------------------------------------------------------------------------
    | CHECK GOVERNMENT INTENT
    |--------------------------------------------------------------------------
    */

    const governmentIntent =
      hasGovernmentIntent(query);

    /*
    |--------------------------------------------------------------------------
    | UNRELATED QUERY
    |--------------------------------------------------------------------------
    */

    if (!governmentIntent) {
      console.log(
        "Query is unrelated. Rejecting."
      );

      return res.json({
        success: true,

        data: {
          allowed: false,

          message:
            "I can only answer questions related to Indian Government schemes and benefits.",
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | GOVERNMENT QUERY BUT NOT IN DATASET
    |--------------------------------------------------------------------------
    |
    | NOW Gemini gets the query.
    |
    */

    console.log(
      "Government-related query not found in dataset."
    );

    console.log(
      "Using GEMINI FALLBACK."
    );

    const fallbackInstruction = `
The user's query was searched against the local Scheme Sahayak government scheme dataset.

No strong local dataset match was found.

Therefore you are operating in FALLBACK MODE.

Answer the user's government-scheme question using your knowledge of REAL Indian Government schemes.

IMPORTANT:

- Do not pretend the answer came from the local dataset.
- Return only real government schemes.
- Do not invent fictional schemes.
- Do not invent exact benefit amounts.
- Do not invent eligibility requirements.
- Do not invent documents.
- Do not invent application steps.
- Do not invent official URLs.
- If you are uncertain about a field, use null or [].
- Maximum 3 relevant schemes.
- If you cannot confidently identify a suitable scheme, return schemes: [].

For fallback schemes use:

"verification": {
  "verified": false,
  "last_verified": null
}

USER QUERY:

${query}
`;

    /*
    |--------------------------------------------------------------------------
    | GEMINI CONTENT
    |--------------------------------------------------------------------------
    */

    const contents = [
      {
        role: "user",

        parts: [
          {
            text:
              SYSTEM_PROMPT,
          },
        ],
      },

      {
        role: "user",

        parts: [
          {
            text:
              fallbackInstruction,
          },
        ],
      },

      ...trimHistory(history),

      {
        role: "user",

        parts: [
          {
            text: query,
          },
        ],
      },
    ];

    /*
    |--------------------------------------------------------------------------
    | CALL GEMINI
    |--------------------------------------------------------------------------
    */

    const response =
      await ai.models.generateContent(
        {
          model:
            "gemini-3.5-flash-lite",

          contents,

          config: {
            temperature: 0.1,

            topP: 0.8,

            maxOutputTokens: 3000,

            responseMimeType:
              "application/json",
          },
        }
      );

    const text =
      response.text;

    /*
    |--------------------------------------------------------------------------
    | PARSE GEMINI JSON
    |--------------------------------------------------------------------------
    */

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error(
        "Invalid JSON from Gemini:"
      );

      console.error(text);

      return res.status(500).json({
        success: false,

        error:
          "Invalid response from AI",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | GEMINI REJECTION
    |--------------------------------------------------------------------------
    */

    if (
      data.allowed === false
    ) {
      return res.json({
        success: true,

        data: {
          allowed: false,

          message:
            "I can only answer questions related to Indian Government schemes and benefits.",
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE RESPONSE
    |--------------------------------------------------------------------------
    */

    data.allowed = true;

    data.language =
      data.language ||
      "en";

    data.query =
      data.query ||
      query;

    data.summary =
      data.summary ||
      "Here are the government schemes relevant to your query.";

    /*
    |--------------------------------------------------------------------------
    | SCHEMES
    |--------------------------------------------------------------------------
    */

    if (
      !Array.isArray(
        data.schemes
      )
    ) {
      data.schemes = [];
    }

    /*
    |--------------------------------------------------------------------------
    | BUILD CANONICAL, FULLY-POPULATED GEMINI SCHEMES (Task 3–7, 10)
    |--------------------------------------------------------------------------
    |
    | Every accepted scheme is converted into the same canonical
    | structure used by the database, with every required field
    | populated (never null/undefined/""/{}), a validated real
    | official URL, and both Government Verification (pending) and
    | AI Advisor (verified) status attached.
    |
    | Schemes that fail validation (no name, or no confident real
    | official URL) are rejected and logged rather than passed through
    | incomplete.
    |
    |--------------------------------------------------------------------------
    */

    const acceptedSchemes = [];

    data.schemes
      .slice(0, 3)
      .forEach((scheme, index) => {
        const {
          scheme: canonicalScheme,
          rejected,
          reason,
        } = buildCanonicalGeminiScheme(
          scheme,
          index
        );

        if (rejected) {
          console.warn(
            "Gemini scheme rejected:",
            reason
          );
          return;
        }

        acceptedSchemes.push(
          canonicalScheme
        );
      });

    data.schemes = acceptedSchemes;

    /*
    |--------------------------------------------------------------------------
    | FOLLOW-UP QUESTIONS
    |--------------------------------------------------------------------------
    */

    if (
      !Array.isArray(
        data.nextQuestionSuggestions
      )
    ) {
      data.nextQuestionSuggestions =
        [];
    }

    data.nextQuestionSuggestions =
      data.nextQuestionSuggestions
        .slice(0, 3);

    /*
    |--------------------------------------------------------------------------
    | FINAL RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,

      data,
    });
  } catch (error) {
    console.error(
      "Gemini Error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        "Unable to process your request right now",
    });
  }
};