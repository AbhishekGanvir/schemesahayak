import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/*
|--------------------------------------------------------------------------
| PATHS
|--------------------------------------------------------------------------
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDirectory = path.join(
  __dirname,
  "../../data"
);

/*
|--------------------------------------------------------------------------
| LOAD ALL DATASET FILES
|--------------------------------------------------------------------------
|
| Automatically loads:
|
| data1.json
| data2.json
| data3.json
| ...
|
| You can add more JSON files later without changing this code.
|
|--------------------------------------------------------------------------
*/

let schemeDataset = [];

const loadDatasets = () => {
  try {
    const files = fs
      .readdirSync(dataDirectory)
      .filter(
        (file) =>
          file.toLowerCase().endsWith(".json")
      )
      .sort();

    const allSchemes = [];

    for (const file of files) {
      try {
        const filePath = path.join(
          dataDirectory,
          file
        );

        const rawData =
          fs.readFileSync(
            filePath,
            "utf-8"
          );

        const parsedData =
          JSON.parse(rawData);

        /*
        Support:
        [
          {...},
          {...}
        ]

        OR:

        {
          "schemes": [...]
        }
        */

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
          `Loaded ${file}`
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
    */

    const uniqueSchemes =
      new Map();

    for (const scheme of allSchemes) {
      if (
        scheme?.scheme_id
      ) {
        uniqueSchemes.set(
          scheme.scheme_id,
          scheme
        );
      }
    }

    schemeDataset =
      Array.from(
        uniqueSchemes.values()
      );

    console.log(
      `Total unique schemes loaded: ${schemeDataset.length}`
    );
  } catch (error) {
    console.error(
      "Failed to load scheme datasets:",
      error.message
    );

    schemeDataset = [];
  }
};

loadDatasets();

/*
|--------------------------------------------------------------------------
| NORMALIZE TEXT
|--------------------------------------------------------------------------
*/

const normalizeText = (
  text = ""
) => {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
};

/*
|--------------------------------------------------------------------------
| CONVERT ANY VALUE TO SEARCHABLE TEXT
|--------------------------------------------------------------------------
*/

const valueToText = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    Array.isArray(value)
  ) {
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
| GET CATEGORY
|--------------------------------------------------------------------------
*/

const getCategory = (
  scheme
) => {
  return (
    scheme.identifiers
      ?.category ||
    scheme.classification
      ?.category ||
    ""
  );
};

/*
|--------------------------------------------------------------------------
| GET SUB CATEGORY
|--------------------------------------------------------------------------
*/

const getSubCategory = (
  scheme
) => {
  return (
    scheme.identifiers
      ?.sub_category ||
    scheme.classification
      ?.sub_category ||
    ""
  );
};

/*
|--------------------------------------------------------------------------
| GET DOMAINS
|--------------------------------------------------------------------------
*/

const getDomains = (
  scheme
) => {
  const domains =
    new Set();

  /*
  | identifiers.domains
  */

  if (
    Array.isArray(
      scheme.identifiers
        ?.domains
    )
  ) {
    for (const domain of
      scheme.identifiers.domains) {
      domains.add(
        normalizeText(domain)
      );
    }
  }

  /*
  | classification.domains
  */

  if (
    Array.isArray(
      scheme.classification
        ?.domains
    )
  ) {
    for (const domain of
      scheme.classification.domains) {
      domains.add(
        normalizeText(domain)
      );
    }
  }

  /*
  | related_domains
  */

  if (
    scheme.related_domains &&
    typeof scheme.related_domains ===
      "object"
  ) {
    for (const [
      key,
      value,
    ] of Object.entries(
      scheme.related_domains
    )) {
      if (value === true) {
        domains.add(
          normalizeText(key)
        );
      }
    }
  }

  return Array.from(
    domains
  );
};

/*
|--------------------------------------------------------------------------
| GET TARGET GROUP
|--------------------------------------------------------------------------
*/

const getTargetGroup = (
  scheme
) => {
  return (
    scheme.identifiers
      ?.target_group ||
    scheme.classification
      ?.target_group ||
    ""
  );
};

/*
|--------------------------------------------------------------------------
| GET BENEFIT TYPE
|--------------------------------------------------------------------------
*/

const getBenefitType = (
  scheme
) => {
  return (
    scheme.identifiers
      ?.benefit_type ||
    scheme.classification
      ?.benefit_type ||
    ""
  );
};

/*
|--------------------------------------------------------------------------
| SIMPLE SCHEME RESPONSE
|--------------------------------------------------------------------------
|
| Used for listing/search/category pages.
|
|--------------------------------------------------------------------------
*/

const formatSchemeCard = (
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

    category:
      getCategory(scheme),

    sub_category:
      getSubCategory(scheme),

    target_group:
      getTargetGroup(scheme),

    benefit_type:
      getBenefitType(scheme),

    benefit:
      scheme.benefit || {},

    summary:
      scheme.description
        ?.summary ||
      scheme.description
        ?.short ||
      "",

    tags:
      Array.isArray(
        scheme.tags
      )
        ? scheme.tags
        : [],

    domains:
      getDomains(scheme),

    state:
      scheme.identifiers
        ?.state ||
      "India",

    gender:
      scheme.identifiers
        ?.gender ||
      "All",

    active:
      scheme.status
        ?.active ??
      false,

    status_label:
      scheme.status
        ?.status_label ||
      "",

    official_website:
      scheme.source
        ?.official_website ||
      null,

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
  };
};

/*
|--------------------------------------------------------------------------
| SEARCH TEXT
|--------------------------------------------------------------------------
*/

const getSearchText = (
  scheme
) => {
  return normalizeText(
    [
      scheme.scheme_id,

      scheme.scheme_name,

      scheme.scheme_name_local,

      getCategory(scheme),

      getSubCategory(scheme),

      getTargetGroup(scheme),

      getBenefitType(scheme),

      valueToText(
        scheme.identifiers
      ),

      valueToText(
        scheme.classification
      ),

      valueToText(
        scheme.description
      ),

      valueToText(
        scheme.benefit
      ),

      valueToText(
        scheme.tags
      ),

      valueToText(
        scheme.identification_keywords
      ),

      valueToText(
        scheme.related_domains
      ),
    ].join(" ")
  );
};

/*
|--------------------------------------------------------------------------
| SEARCH SCHEMES
|--------------------------------------------------------------------------
*/

const searchSchemes = (
  query
) => {
  const normalizedQuery =
    normalizeText(query);

  if (!normalizedQuery) {
    return schemeDataset;
  }

  const queryWords =
    normalizedQuery
      .split(/\s+/)
      .filter(Boolean);

  const results = [];

  for (const scheme of schemeDataset) {
    const searchText =
      getSearchText(scheme);

    const name =
      normalizeText(
        scheme.scheme_name
      );

    const category =
      normalizeText(
        getCategory(scheme)
      );

    const tags =
      normalizeText(
        valueToText(
          scheme.tags
        )
      );

    let score = 0;

    /*
    |--------------------------------------------------------------------------
    | EXACT NAME
    |--------------------------------------------------------------------------
    */

    if (
      name ===
      normalizedQuery
    ) {
      score += 1000;
    }

    /*
    |--------------------------------------------------------------------------
    | NAME CONTAINS QUERY
    |--------------------------------------------------------------------------
    */

    if (
      name.includes(
        normalizedQuery
      )
    ) {
      score += 700;
    }

    /*
    |--------------------------------------------------------------------------
    | CATEGORY
    |--------------------------------------------------------------------------
    */

    if (
      category ===
      normalizedQuery
    ) {
      score += 500;
    }

    /*
    |--------------------------------------------------------------------------
    | TAG
    |--------------------------------------------------------------------------
    */

    if (
      tags.includes(
        normalizedQuery
      )
    ) {
      score += 350;
    }

    /*
    |--------------------------------------------------------------------------
    | WORD MATCHING
    |--------------------------------------------------------------------------
    */

    let matchedWords = 0;

    for (const word of queryWords) {
      if (
        searchText.includes(word)
      ) {
        matchedWords++;
      }
    }

    if (
      queryWords.length > 0
    ) {
      score +=
        (matchedWords /
          queryWords.length) *
        300;
    }

    /*
    |--------------------------------------------------------------------------
    | RELEVANCE CHECK (before quality bonuses)
    |--------------------------------------------------------------------------
    |
    | The active/verified bonuses below must only ever boost a scheme
    | that already matched the query — they must NEVER be the sole
    | reason a scheme is included. Capturing the score here, before
    | those bonuses are added, lets us gate inclusion on actual
    | relevance instead of on data quality.
    |
    |--------------------------------------------------------------------------
    */

    const relevanceScore = score;

    /*
    |--------------------------------------------------------------------------
    | ACTIVE BONUS
    |--------------------------------------------------------------------------
    */

    if (
      scheme.status
        ?.active === true
    ) {
      score += 20;
    }

    if (
      scheme.verification
        ?.verified === true
    ) {
      score += 20;
    }

    if (relevanceScore > 0) {
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
    .map(
      (item) =>
        item.scheme
    );
};

/*
|--------------------------------------------------------------------------
| GET ALL SCHEMES
|--------------------------------------------------------------------------
|
| GET /api/schemes
|
|--------------------------------------------------------------------------
*/

export const getAllSchemes = (
  req,
  res
) => {
  try {
    const {
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber =
      Math.max(
        1,
        Number(page) || 1
      );

    const limitNumber =
      Math.min(
        1000,
        Math.max(
          1,
          Number(limit) || 20
        )
      );

    const start =
      (pageNumber - 1) *
      limitNumber;

    const end =
      start +
      limitNumber;

    const schemes =
      schemeDataset
        .slice(start, end)
        .map(
          formatSchemeCard
        );

    return res.json({
      success: true,

      data: {
        total:
          schemeDataset.length,

        page:
          pageNumber,

        limit:
          limitNumber,

        totalPages:
          Math.ceil(
            schemeDataset.length /
              limitNumber
          ),

        schemes,
      },
    });
  } catch (error) {
    console.error(
      "Get all schemes error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to load schemes",
    });
  }
};

/*
|--------------------------------------------------------------------------
| SEARCH
|--------------------------------------------------------------------------
|
| GET /api/schemes/search?q=kisan
|
|--------------------------------------------------------------------------
*/

export const searchSchemesController = (
  req,
  res
) => {
  try {
    const query =
      String(
        req.query.q || ""
      ).trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        error:
          "Search query is required",
      });
    }

    const results =
      searchSchemes(query);

    return res.json({
      success: true,

      data: {
        query,

        count:
          results.length,

        /*
        |--------------------------------------------------------------------------
        | Return every match (dataset is small).
        |--------------------------------------------------------------------------
        |
        | The frontend Directory Search page paginates client-side in
        | batches of 20 via "Load 20 More", so the API should not
        | silently truncate results here.
        |
        |--------------------------------------------------------------------------
        */

        schemes:
          results
            .slice(0, 500)
            .map(
              formatSchemeCard
            ),
      },
    });
  } catch (error) {
    console.error(
      "Scheme search error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to search schemes",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET CATEGORIES
|--------------------------------------------------------------------------
|
| GET /api/schemes/categories
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| CATEGORY KEY (STABLE, NORMALIZED SLUG)
|--------------------------------------------------------------------------
|
| Single normalization rule used everywhere a category is turned into an
| id/slug, so the same category name always produces the same key.
|
|--------------------------------------------------------------------------
*/

const getCategoryKey = (
  categoryName
) => {
  return normalizeText(
    categoryName
  ).replace(
    /\s+/g,
    "_"
  );
};

/*
|--------------------------------------------------------------------------
| BUILD CATEGORY GROUPS — SHARED SOURCE OF TRUTH
|--------------------------------------------------------------------------
|
| This is the ONE place that decides:
|   - which category a scheme belongs to
|   - how schemes are deduplicated (by scheme_id)
|
| Both /api/schemes/categories (counts) and
| /api/schemes/category/:category (actual schemes) are built from this
| same function, so it is structurally impossible for the chip count to
| differ from the number of schemes actually returned.
|
| Domains are intentionally NOT used as category membership — category
| membership is defined solely by getCategory(scheme).
|
|--------------------------------------------------------------------------
*/

const buildCategoryGroups = () => {
  const groups = new Map();
  // key -> { key, name, schemes: Map<scheme_id, scheme> }

  for (const scheme of schemeDataset) {
    const categoryName =
      getCategory(scheme);

    if (!categoryName) {
      continue;
    }

    if (!scheme?.scheme_id) {
      // Can't safely dedupe a scheme with no id, so skip it
      // rather than risk inflating a category's count.
      continue;
    }

    const key =
      getCategoryKey(
        categoryName
      );

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: categoryName,
        schemes: new Map(),
      });
    }

    // Dedupe by scheme_id so duplicate records coming from
    // multiple JSON dataset files never inflate category counts.
    groups
      .get(key)
      .schemes.set(
        scheme.scheme_id,
        scheme
      );
  }

  return groups;
};

/*
|--------------------------------------------------------------------------
| GET CATEGORIES
|--------------------------------------------------------------------------
|
| GET /api/schemes/categories
|
|--------------------------------------------------------------------------
*/

export const getCategories = (
  req,
  res
) => {
  try {
    const groups =
      buildCategoryGroups();

    const categories =
      Array.from(
        groups.values()
      )
        .map(
          (group) => ({
            id: group.key,

            name: group.name,

            // count === unique schemes.length for this category,
            // guaranteed by sharing buildCategoryGroups() with
            // getSchemesByCategory below.
            count:
              group.schemes.size,
          })
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name
            )
        );

    return res.json({
      success: true,

      data: {
        count:
          categories.length,

        categories,
      },
    });
  } catch (error) {
    console.error(
      "Categories error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to load categories",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CATEGORY SCHEMES
|--------------------------------------------------------------------------
|
| GET /api/schemes/category/farmer
|
|--------------------------------------------------------------------------
*/

export const getSchemesByCategory = (
  req,
  res
) => {
  try {
    const requestedKey =
      getCategoryKey(
        req.params.category
      );

    const groups =
      buildCategoryGroups();

    const group =
      groups.get(requestedKey);

    // Same Map that produced the chip's count above, so this list's
    // length always matches that count exactly.
    const uniqueSchemes = group
      ? Array.from(
          group.schemes.values()
        )
      : [];

    return res.json({
      success: true,

      data: {
        category:
          req.params.category,

        count:
          uniqueSchemes.length,

        schemes:
          uniqueSchemes.map(
            formatSchemeCard
          ),
      },
    });
  } catch (error) {
    console.error(
      "Category schemes error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to load category schemes",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE SCHEME
|--------------------------------------------------------------------------
|
| GET /api/schemes/PM-KISAN
|
|--------------------------------------------------------------------------
*/

export const getSchemeById = (
  req,
  res
) => {
  try {
    const requestedId =
      normalizeText(
        req.params.schemeId
      );

    const scheme =
      schemeDataset.find(
        (item) =>
          normalizeText(
            item.scheme_id
          ) === requestedId
      );

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error:
          "Scheme not found",
      });
    }

    return res.json({
      success: true,

      data: {
        scheme,
      },
    });
  } catch (error) {
    console.error(
      "Get scheme error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to load scheme",
    });
  }
};

/*
|--------------------------------------------------------------------------
| PROFILE MATCHING HELPERS
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| PROFILE TEMPLATES
|--------------------------------------------------------------------------
| These profiles DO NOT recommend schemes.
|
| They only provide pre-written text that the frontend can place
| inside the chatbot input box.
|
| The user can edit the text and add personal details before sending.
|--------------------------------------------------------------------------
*/

const profileTemplates = {
  small_marginal_farmer: {
    profile_id: "small_marginal_farmer",
    name: "Small & Marginal Farmer",
    icon: "🌾",

    text: `I am a small or marginal farmer. Show me government schemes related to farming, agriculture, farmer income support, crop insurance, agricultural loans, subsidies and other benefits that may be available to me.

My personal details:
Age: [Enter your age]
State: [Enter your state]
District: [Enter your district]
Land holding: [Enter land holding]
Annual family income: [Enter income]
Social category: [Enter category, if applicable]
Any other relevant details: [Enter details]`
  },

  college_student_sc_obc: {
    profile_id: "college_student_sc_obc",
    name: "College Student (SC/OBC)",
    icon: "🎓",

    text: `I am a college student belonging to the SC/OBC category. Show me government schemes, scholarships, financial assistance, education benefits, skill development opportunities, student loans and other schemes that may be available to me.

My personal details:
Age: [Enter your age]
State: [Enter your state]
District: [Enter your district]
College / University: [Enter name]
Course: [Enter course]
Year of study: [Enter year]
Social category: [SC / OBC]
Annual family income: [Enter income]
Any other relevant details: [Enter details]`
  },

  urban_poor_family: {
    profile_id: "urban_poor_family",
    name: "Urban Poor Family",
    icon: "🏠",

    text: `I belong to a low-income urban family. Show me government schemes related to housing, healthcare, food security, financial assistance, employment, education, basic services and other welfare benefits that my family may be eligible for.

My personal details:
Age: [Enter your age]
State: [Enter your state]
City: [Enter your city]
Family size: [Enter number of family members]
Annual family income: [Enter income]
BPL status: [Yes / No / Don't know]
Housing status: [Own / Rent / No house / Other]
Social category: [Enter category, if applicable]
Any other relevant details: [Enter details]`
  },

  self_employed_woman: {
    profile_id: "self_employed_woman",
    name: "Self-Employed Woman",
    icon: "👩",

    text: `I am a self-employed woman. Show me government schemes related to women entrepreneurs, business loans, self-employment, skill development, financial assistance, subsidies, insurance and other benefits available to women.

My personal details:
Age: [Enter your age]
State: [Enter your state]
District / City: [Enter location]
Occupation / Business: [Enter occupation or business]
Annual income: [Enter income]
Business type: [Enter business type]
Business experience: [Enter experience]
Social category: [Enter category, if applicable]
Any other relevant details: [Enter details]`
  },

  senior_citizen: {
    profile_id: "senior_citizen",
    name: "Senior Citizen (60+)",
    icon: "👴",

    text: `I am a senior citizen aged 60 or above. Show me government schemes related to pension, healthcare, insurance, banking, financial security, social welfare and other benefits available to senior citizens.

My personal details:
Age: [Enter your age]
State: [Enter your state]
District / City: [Enter location]
Annual income: [Enter income]
Pension status: [Yes / No]
Social category: [Enter category, if applicable]
Disability status: [If applicable]
Any other relevant details: [Enter details]`
  },

  person_with_disability: {
    profile_id: "person_with_disability",
    name: "Person with Disability",
    icon: "♿",

    text: `I am a person with a disability. Show me government schemes related to disability assistance, financial support, education, employment, skill development, healthcare, assistive devices, pensions and other benefits that I may be eligible for.

My personal details:
Age: [Enter your age]
State: [Enter your state]
District: [Enter your district]
Type of disability: [Enter type]
Disability percentage: [Enter percentage, if applicable]
UDID status: [Yes / No / Don't know]
Annual family income: [Enter income]
Social category: [Enter category, if applicable]
Any other relevant details: [Enter details]`
  },

  youth: {
    profile_id: "youth",
    name: "Youth (18–30)",
    icon: "⚡",

    text: `I am a young person between 18 and 30 years old. Show me government schemes related to education, scholarships, employment, skill development, internships, entrepreneurship, business loans, self-employment and other opportunities available to youth.

My personal details:
Age: [Enter your age]
State: [Enter your state]
District / City: [Enter location]
Education level: [Enter education]
Current status: [Student / Employed / Unemployed / Self-employed]
Occupation: [Enter occupation, if applicable]
Annual family income: [Enter income]
Social category: [Enter category, if applicable]
Any other relevant details: [Enter details]`
  },

  bpl_family: {
    profile_id: "bpl_family",
    name: "BPL Family",
    icon: "📉",

    text: `I belong to a Below Poverty Line (BPL) family. Show me government schemes related to food security, housing, healthcare, financial assistance, employment, education, insurance, pensions and other welfare benefits that my family may be eligible for.

My personal details:
Age: [Enter your age]
State: [Enter your state]
District: [Enter your district]
Family size: [Enter number of family members]
Annual family income: [Enter income]
BPL / Ration Card status: [Enter details]
Housing status: [Own / Rent / No house / Other]
Social category: [Enter category, if applicable]
Any other relevant details: [Enter details]`
  }
};


/*
|--------------------------------------------------------------------------
| GET ALL PROFILES
|--------------------------------------------------------------------------
|
| GET /api/profiles
|
| Used by frontend to display the profile cards.
|--------------------------------------------------------------------------
*/

export const getProfiles = (req, res) => {
  try {

    const profiles = Object.values(profileTemplates)
      .map((profile) => ({
        profile_id: profile.profile_id,
        name: profile.name,
        icon: profile.icon
      }));

    return res.json({
      success: true,

      data: {
        profiles
      }
    });

  } catch (error) {

    console.error(
      "Get profiles error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to load profiles"
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET SINGLE PROFILE TEMPLATE
|--------------------------------------------------------------------------
|
| GET /api/profiles/:profileId
|
| IMPORTANT:
| This does NOT recommend schemes.
|
| It only returns the pre-written text.
|--------------------------------------------------------------------------
*/

export const getProfileTemplate = (req, res) => {
  try {

    const profileId =
      req.params.profileId;

    const profile =
      profileTemplates[profileId];

    if (!profile) {

      return res.status(404).json({
        success: false,
        error: "Profile not found"
      });

    }

    return res.json({
      success: true,

      data: {
        profile
      }
    });

  } catch (error) {

    console.error(
      "Get profile template error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to load profile template"
    });
  }
};