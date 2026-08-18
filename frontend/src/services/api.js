// ================= API SERVICE =================
//
// Single source of truth for every network call the frontend makes.
// No component or hook should call fetch() directly — everything goes
// through the helpers exported from this file.
//
// Gemini-generated schemes are also cached in localStorage so a scheme
// that does not exist in the database can still open on the detail page.

export const API_BASE_URL = "";

// ---------------------------------------------------------------------
// Low level request helper
// ---------------------------------------------------------------------

class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(
  path,
  {
    method = 'GET',
    body,
    headers,
    signal,
    isFormData = false
  } = {}
) {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path}`;

  const finalHeaders = { ...headers };
  let finalBody = body;

  // Only add JSON body/header when a body actually exists.
  if (body !== undefined && !isFormData) {
    finalHeaders['Content-Type'] =
      finalHeaders['Content-Type'] || 'application/json';

    finalBody =
      typeof body === 'string'
        ? body
        : JSON.stringify(body);
  }

  let response;

  try {
    const fetchOptions = {
      method,
      headers: finalHeaders,
      signal
    };

    // Do not send a body for GET requests.
    if (finalBody !== undefined) {
      fetchOptions.body = finalBody;
    }

    response = await fetch(url, fetchOptions);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }

    console.error('FETCH ERROR:', {
      url,
      method,
      error: err
    });

    throw new ApiError(
      err.message ||
        'Network error — please check your connection and try again.',
      {
        status: 0,
        data: err
      }
    );
  }

  const contentType =
    response.headers.get('content-type') || '';

  const isJson =
    contentType.includes('application/json');

  const payload = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const message =
      (isJson &&
        payload &&
        (payload.message || payload.error)) ||
      `Request failed (${response.status})`;

    throw new ApiError(message, {
      status: response.status,
      data: payload
    });
  }

  return payload;
}

function getJson(path, opts = {}) {
  return request(path, {
    ...opts,
    method: 'GET',
    body: undefined
  });
}

function postJson(path, body, opts = {}) {
  return request(path, {
    ...opts,
    method: 'POST',
    body
  });
}

function postFormData(path, formData, opts = {}) {
  return request(path, {
    ...opts,
    method: 'POST',
    body: formData,
    isFormData: true
  });
}

export { postFormData };

export { ApiError };

// ---------------------------------------------------------------------
// Small helpers shared by normalizers
// ---------------------------------------------------------------------

const CATEGORY_ICONS = {
  agriculture: '🌾',
  education: '🎓',
  healthcare: '🏥',
  health: '🏥',
  women: '👩',
  'women & child': '👩',
  housing: '🏠',
  'senior citizen': '👴',
  'senior citizens': '👴',
  disability: '♿',
  divyangjan: '♿',
  youth: '⚡',
  'youth & skills': '⚡',
  employment: '💼',
  finance: '💳',
  social: '🤝',
  default: '📄',
  banking: '🏦',
  business: '🏪',
  energy: '⚡',
  farmer: '🧑‍🌾',
  fisheries: '🎣',
  pension: '🧓'
};

function iconForCategory(category) {
  if (!category) {
    return CATEGORY_ICONS.default;
  }

  const key = String(category)
    .trim()
    .toLowerCase();

  return (
    CATEGORY_ICONS[key] ||
    CATEGORY_ICONS.default
  );
}

function firstNonEmpty(...values) {
  for (const v of values) {
    if (v === null || v === undefined) {
      continue;
    }

    if (
      typeof v === 'string' &&
      v.trim() === ''
    ) {
      continue;
    }

    if (
      Array.isArray(v) &&
      v.length === 0
    ) {
      continue;
    }

    return v;
  }

  return undefined;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  return [value];
}

// Extracts a payload from common:
//
// { success, data: {...} }
// { data: [...] }
// bare-array
// bare-object
//
function unwrap(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload)
  ) {
    if ('data' in payload) {
      return payload.data;
    }
  }

  return payload;
}

// ---------------------------------------------------------------------
// Gemini Scheme Browser Cache
// ---------------------------------------------------------------------
//
// Complete Gemini scheme objects are stored here.
//
// Example:
//
// localStorage
//   gemini_scheme_cache_v2
//      {
//        "gemini-example-scheme": {
//          scheme_id: "...",
//          scheme_name: "...",
//          eligibility: {...},
//          application: {...},
//          payment: {...}
//        }
//      }
//
// This allows a Gemini-only scheme to open even when it isn't in DB.
//
// v2: the backend now returns a fully normalized/validated canonical
// Gemini scheme (see gemini.controller.js buildCanonicalGeminiScheme),
// with every required field populated and a validated official URL.
// Bumping the cache key ensures old, incomplete v1 entries (which
// could contain null/""/{} fields) can never resurface for a user who
// cached them before this fix.

const GEMINI_SCHEME_CACHE_KEY = 'gemini_scheme_cache_v2';

function hasValue(v) {
  return (
    v !== null &&
    v !== undefined &&
    v !== '' &&
    !(Array.isArray(v) && v.length === 0)
  );
}

function titleCaseWord(value) {
  if (!value || typeof value !== 'string') return value || null;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function isGeminiShapedScheme(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (raw._adapted === true) return false; // already converted
  return (
    (!!raw.classification || !!raw.officialPortal) &&
    !(raw.identifiers && raw.identifiers.category)
  );
}

export function adaptGeminiScheme(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  if (!isGeminiShapedScheme(raw)) return raw; // DB-shaped or already adapted

  const classification = raw.classification || {};
  const authority = raw.authority || {};
  const benefit = raw.benefit || {};
  const eligibility = raw.eligibility || {};
  const application = raw.application || {};
  const payment = raw.payment || {};
  const officialPortal = raw.officialPortal || {};
  const verification = raw.verification || {};

  const ministryDepartment =
    [authority.department, authority.ministry]
      .filter(Boolean)
      .join(', ') || null;

  const hasAgeRange =
    hasValue(eligibility.age_min) || hasValue(eligibility.age_max);

  const hasIncomeLimit = hasValue(eligibility.income_limit);

  return {
    ...raw,
    _adapted: true,

    scheme_id: raw.scheme_id || raw.id || raw._id,
    scheme_name: raw.scheme_name || raw.name,
    scheme_name_local: raw.scheme_name_local || null,

    identifiers: {
      category: classification.category ?? null,
      sub_category: classification.sub_category ?? null,
      target_group: classification.target_group ?? null,
      benefit_type: benefit.type ? titleCaseWord(benefit.type) : null,
      scheme_type: null,
      state: eligibility.residency ?? null,
      sector: classification.sector ?? null,
      gender: null
    },

    status: raw.status || {},

    authority: {
      ministry_department: ministryDepartment,
      government_level: titleCaseWord(authority.level),
      state: eligibility.residency ?? null
    },

    description: {
      summary: raw.summary || null,
      short: null,
      full: null
    },

    benefit: {
      amount: benefit.amount ?? null,
      currency: hasValue(benefit.amount) ? 'INR' : null,
      frequency: payment.frequency ?? null,
      annual_amount: null,
      benefit_description: benefit.description ?? null
    },

    eligibility: {
      age: hasAgeRange
        ? {
            minimum: eligibility.age_min ?? null,
            maximum: eligibility.age_max ?? null
          }
        : null,
      gender: eligibility.gender ?? null,
      residency: eligibility.residency ?? null,
      income: hasIncomeLimit
        ? {
            maximum_annual_family_income: eligibility.income_limit,
            currency: 'INR',
            required: true
          }
        : null,
      bank_account: null,
      conditions: eligibility.conditions || [],
      exclusions: eligibility.exclusions || []
    },

    documents_required: raw.documents || [],

    application: {
      mode: application.mode ?? null,
      steps: application.steps || []
    },

    payment: {
      method: payment.mode ?? null,
      dbt: payment.mode
        ? String(payment.mode).toUpperCase() === 'DBT'
        : null,
      bank_account_required: null,
      aadhaar_linked: null
    },

    faqs: raw.faqs || [],
    tags: raw.tags || [],

    source: {
      source_type: officialPortal.name || 'AI-generated summary (unverified)',
      official_website: officialPortal.url ?? null,
      official_notification: null,
      source_reference: officialPortal.name || null,
      last_verified: verification.last_verified ?? null
    },

    verification: {
      verified: verification.verified ?? false,
      verification_note: verification.verified
        ? null
        : 'This scheme was generated by AI and has not been manually verified. Please confirm details on the official portal before applying.'
    }
  };
}

function getGeminiSchemeCache() {
  try {
    const raw = localStorage.getItem(GEMINI_SCHEME_CACHE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }

    return {};
  } catch (error) {
    console.warn('[Gemini Cache] Failed to read cache:', error);
    return {};
  }
}

function makeSchemeId(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getOrCreateGeminiSchemeId(scheme) {
  const existingId = firstNonEmpty(
    scheme.scheme_id,
    scheme.id,
    scheme._id
  );

  if (existingId) {
    return String(existingId);
  }

  const name = firstNonEmpty(
    scheme.scheme_name,
    scheme.name,
    scheme.title
  );

  if (!name) {
    return null;
  }

  const slug = makeSchemeId(name);

  if (!slug) {
    return null;
  }

  return `gemini-${slug}`;
}

function saveGeminiSchemeToCache(scheme) {
  if (!scheme || typeof scheme !== 'object') {
    return null;
  }

  const schemeId = getOrCreateGeminiSchemeId(scheme);

  if (!schemeId) {
    console.warn(
      '[Gemini Cache] Cannot cache scheme because it has no usable ID or name:',
      scheme
    );
    return null;
  }

  try {
    const cache = getGeminiSchemeCache();

    const completeScheme = {
      ...scheme,
      scheme_id:
        scheme.scheme_id ||
        scheme.id ||
        scheme._id ||
        schemeId,
      _source: 'gemini',
      _cachedAt: Date.now()
    };

    cache[String(schemeId)] = completeScheme;

    localStorage.setItem(
      GEMINI_SCHEME_CACHE_KEY,
      JSON.stringify(cache)
    );

    console.log(
      '[Gemini Cache] Saved complete scheme:',
      schemeId
    );

    return completeScheme;
  } catch (error) {
    console.warn(
      '[Gemini Cache] Failed to save scheme:',
      error
    );

    return null;
  }
}

function getGeminiSchemeFromCache(schemeId) {
  if (!schemeId) {
    return null;
  }

  try {
    const cache =
      getGeminiSchemeCache();

    const requestedId =
      String(schemeId).trim();

    // =============================================================
    // 1. EXACT KEY
    // =============================================================

    if (cache[requestedId]) {
      console.log(
        '[Gemini Cache] Exact match:',
        requestedId
      );

      return cache[requestedId];
    }

    // =============================================================
    // 2. GEMINI GENERATED ID
    // =============================================================

    const slug =
      makeSchemeId(requestedId);

    if (slug) {
      const generatedId =
        slug.startsWith('gemini-')
          ? slug
          : `gemini-${slug}`;

      if (cache[generatedId]) {
        console.log(
          '[Gemini Cache] Generated ID match:',
          generatedId
        );

        return cache[generatedId];
      }
    }

    // =============================================================
    // 3. SEARCH INSIDE ALL CACHE ENTRIES
    // =============================================================

    for (const cached of Object.values(cache)) {
      if (
        !cached ||
        typeof cached !== 'object'
      ) {
        continue;
      }

      const ids = [
        cached.scheme_id,
        cached.id,
        cached._id
      ]
        .filter(Boolean)
        .map(value =>
          String(value).trim()
        );

      if (
        ids.includes(requestedId)
      ) {
        console.log(
          '[Gemini Cache] ID found inside cached object:',
          requestedId
        );

        return cached;
      }

      const names = [
        cached.scheme_name,
        cached.name,
        cached.title
      ]
        .filter(Boolean)
        .map(value =>
          String(value)
            .trim()
            .toLowerCase()
        );

      if (
        names.includes(
          requestedId.toLowerCase()
        )
      ) {
        console.log(
          '[Gemini Cache] Name match:',
          requestedId
        );

        return cached;
      }
    }

    console.log(
      '[Gemini Cache] No match:',
      requestedId
    );

    return null;

  } catch (error) {
    console.warn(
      '[Gemini Cache] Failed to retrieve scheme:',
      error
    );

    return null;
  }
}

// Optional helper if you ever need to clear Gemini cache.
export function clearGeminiSchemeCache() {
  try {
    localStorage.removeItem(
      GEMINI_SCHEME_CACHE_KEY
    );

    console.log(
      '[Gemini Cache] Cache cleared'
    );
  } catch (error) {
    console.warn(
      '[Gemini Cache] Failed to clear cache:',
      error
    );
  }
}

// Optional helper for debugging.
export function getCachedGeminiSchemes() {
  return getGeminiSchemeCache();
}

// ---------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------

export function normalizeScheme(raw) {
  if (
    !raw ||
    typeof raw !== 'object'
  ) {
    return null;
  }

  const identifiers =
    raw.identifiers || {};

  const authority =
    raw.authority || {};

  const description =
    raw.description || {};

  const benefit =
    raw.benefit || {};

  const source =
    raw.source || {};

  // Normal scheme ID.
  // Gemini-generated schemes can receive a generated ID.
  const id =
    getOrCreateGeminiSchemeId(raw);

  if (!id) {
    return null;
  }

  const name = firstNonEmpty(
    raw.scheme_name,
    raw.name,
    raw.title
  );

  const category = firstNonEmpty(
    identifiers.category,
    raw.category
  );

  const summary = firstNonEmpty(
    description.summary,
    description.short,
    raw.summary
  );

  const governmentLevel =
    firstNonEmpty(
      authority.government_level,
      raw.governmentLevel,
      raw.government_level
    );

  const benefitText =
    firstNonEmpty(
      benefit.benefit_description,

      typeof raw.benefit === 'string'
        ? raw.benefit
        : undefined,

      benefit.amount
        ? `${benefit.currency || '₹'}${benefit.amount}${
            benefit.frequency
              ? ` / ${benefit.frequency}`
              : ''
          }`
        : undefined
    );

  // Official URL can arrive in several different shapes depending on
  // which layer produced the scheme object:
  //   - raw dataset / detail payload : source.official_website
  //   - backend list/search/category : official_website (flattened)
  //   - Gemini-formatted scheme      : officialPortal.url
  //   - misc / future-proofing       : officialWebsite, applicationUrl, application_url
  // normalizeUrl() also unwraps the "[text](url)" markdown format that
  // appears in some dataset entries and rejects anything that isn't a
  // real http(s) URL so we never fabricate/display a broken link.
  const applicationUrl = normalizeUrl(
    firstNonEmpty(
      source.official_website,
      raw.official_website,
      raw.officialWebsite,
      raw.applicationUrl,
      raw.application_url,
      raw.officialPortal && raw.officialPortal.url
    )
  );

  const keywords =
    firstNonEmpty(
      raw.identification_keywords,
      raw.keywords,
      raw.tags
    ) || [];

  return {
  id: String(id),

  /*
   * Keep scheme_id too.
   *
   * This makes the object compatible with:
   * - database scheme objects
   * - Gemini objects
   * - existing card navigation
   * - detail page routing
   */
  scheme_id: String(id),

  name:
    name || 'Unnamed Scheme',

  nameLocal:
    firstNonEmpty(
      raw.scheme_name_local,
      raw.nameLocal
    ) || null,

  category:
    category || null,

  summary:
    summary || '',

  governmentLevel:
    governmentLevel || null,

  benefit:
    benefitText || null,

  applicationUrl:
    applicationUrl || null,

  icon:
    iconForCategory(category),

  keywords:
    asArray(keywords).map((k) =>
      String(k).toLowerCase()
    )
};
}

export function normalizeSchemesList(payload) {
  const data = unwrap(payload);

  const items =
    Array.isArray(data)
      ? data
      : data?.schemes ||
        data?.items ||
        [];

  const count =
    firstNonEmpty(
      data?.count,
      data?.total,
      Array.isArray(items)
        ? items.length
        : undefined
    ) || 0;

  return {
    items: items
      .map(normalizeScheme)
      .filter(Boolean),

    count
  };
}

// ---------------------------------------------------------------------
// Full scheme detail normalizer
// ---------------------------------------------------------------------

export function normalizeSchemeDetail(payload) {
  const data = unwrap(payload);

  const scheme =
    data?.scheme ||
    data?.result?.scheme ||
    data;

  if (
    !scheme ||
    typeof scheme !== 'object' ||
    Array.isArray(scheme)
  ) {
    return null;
  }

  const g = (obj) =>
    obj &&
    typeof obj === 'object' &&
    !Array.isArray(obj)
      ? obj
      : {};

  const identifiers =
    g(scheme.identifiers);

  const status =
    g(scheme.status);

  const authority =
    g(scheme.authority);

  const benefit =
    g(scheme.benefit);

  const description =
    g(scheme.description);

  const eligibility =
    g(scheme.eligibility);

  const application =
    g(scheme.application);

  const payment =
    g(scheme.payment);

  const source =
    g(scheme.source);

  const verification =
    g(scheme.verification);

  return {
    scheme_id:
      firstNonEmpty(
        scheme.scheme_id,
        scheme.id,
        scheme._id
      ) || null,

    scheme_name:
      firstNonEmpty(
        scheme.scheme_name,
        scheme.name,
        scheme.title
      ) || 'Unnamed Scheme',

    scheme_name_local:
      firstNonEmpty(
        scheme.scheme_name_local,
        scheme.nameLocal
      ) || null,

    identifiers: {
      category:
        identifiers.category ?? null,

      sub_category:
        identifiers.sub_category ?? null,

      gender:
        identifiers.gender ?? null,

      state:
        identifiers.state ?? null,

      sector:
        identifiers.sector ?? null,

      domains:
        asArray(
          identifiers.domains
        ),

      target_group:
        identifiers.target_group ?? null,

      benefit_type:
        identifiers.benefit_type ?? null,

      scheme_type:
        identifiers.scheme_type ?? null
    },

    status: {
      active:
        status.active ?? null,

      status_label:
        status.status_label ?? null
    },

    authority: {
      ministry_department:
        authority.ministry_department ??
        null,

      government_level:
        authority.government_level ??
        null,

      state:
        authority.state ?? null
    },

    benefit: {
      amount:
        benefit.amount ?? null,

      currency:
        benefit.currency ?? null,

      frequency:
        benefit.frequency ?? null,

      annual_amount:
        benefit.annual_amount ?? null,

      benefit_description:
        benefit.benefit_description ??
        null
    },

    description: {
      summary:
        description.summary ?? null,

      short:
        description.short ?? null,

      full:
        description.full ?? null
    },

    eligibility: {
      age:
        eligibility.age ?? null,

      gender:
        eligibility.gender ?? null,

      residency:
        eligibility.residency ?? null,

      income:
        eligibility.income ?? null,

      bank_account:
        eligibility.bank_account ?? null,

      conditions:
        asArray(
          eligibility.conditions
        ),

      exclusions:
        asArray(
          eligibility.exclusions
        )
    },

    documents_required:
      asArray(
        scheme.documents_required
      ),

    application: {
      mode:
        application.mode ?? null,

      steps:
        asArray(
          application.steps
        )
    },

    payment: {
      method:
        payment.method ?? null,

      dbt:
        payment.dbt ?? null,

      bank_account_required:
        payment.bank_account_required ??
        null,

      aadhaar_linked:
        payment.aadhaar_linked ??
        null
    },

    faqs:
      asArray(scheme.faqs)
        .filter(
          (faq) =>
            faq &&
            typeof faq === 'object' &&
            (
              faq.question ||
              faq.answer
            )
        ),

    tags:
      asArray(scheme.tags),

    identification_keywords:
      asArray(
        scheme.identification_keywords
      ),

    related_domains:
      asArray(
        scheme.related_domains
      ),

    source: {
      source_type:
        source.source_type ?? null,

      official_website:
        normalizeUrl(
          firstNonEmpty(
            source.official_website,
            scheme.official_website,
            scheme.officialWebsite,
            scheme.applicationUrl,
            scheme.application_url,
            g(scheme.officialPortal).url
          )
        ),

      official_notification:
        normalizeUrl(
          source.official_notification
        ),

      source_reference:
        source.source_reference ?? null,

      last_verified:
        source.last_verified ?? null
    },

    verification: {
      verified:
        verification.verified ?? null,

      verification_status:
        verification.verification_status ??
        null,

      verification_source:
        verification.verification_source ??
        null,

      verification_note:
        verification.verification_note ??
        null
    },

    // Only present for AI/Gemini-generated schemes. Genuine database
    // schemes simply won't have this object, so it stays undefined and
    // the detail page's AI Advisor badge is skipped for them.
    ai_advisor:
      scheme.ai_advisor &&
      typeof scheme.ai_advisor === 'object'
        ? {
            generated:
              scheme.ai_advisor.generated ??
              null,

            verified:
              scheme.ai_advisor.verified ??
              null,

            status:
              scheme.ai_advisor.status ??
              null,

            note:
              scheme.ai_advisor.note ??
              null
          }
        : null
  };
}

// ---------------------------------------------------------------------
// URL helper
// ---------------------------------------------------------------------

function normalizeUrl(value) {
  if (
    !value ||
    typeof value !== 'string'
  ) {
    return null;
  }

  const markdownMatch =
    value.match(
      /\((https?:\/\/[^)]+)\)/
    );

  if (markdownMatch) {
    return markdownMatch[1];
  }

  if (
    /^https?:\/\//i.test(value)
  ) {
    return value;
  }

  return null;
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export function normalizeCategory(raw) {
  if (
    !raw ||
    typeof raw !== 'object'
  ) {
    return null;
  }

  // The backend's stable, normalized slug (`id`) is the real category
  // key used to fetch /api/schemes/category/:category. Prefer it over
  // the human-readable `name` so the frontend always requests using
  // the same key the backend grouped schemes by.
  const key =
    firstNonEmpty(
      raw.id,
      raw.key,
      raw.category,
      raw.name
    );

  if (!key) {
    return null;
  }

  return {
    key: String(key),

    title:
      firstNonEmpty(
        raw.title,
        raw.name,
        raw.label,
        String(key)
      ),

    count:
      firstNonEmpty(
        raw.count,
        raw.total
      ) ?? null,

    icon:
      raw.icon ||
      iconForCategory(key)
  };
}

export function normalizeCategoriesList(
  payload
) {
  const data = unwrap(payload);

  const items =
    Array.isArray(data)
      ? data
      : data?.categories ||
        data?.items ||
        [];

  return items
    .map(normalizeCategory)
    .filter(Boolean);
}

// ---------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------

export function normalizeProfile(raw) {
  if (
    !raw ||
    typeof raw !== 'object'
  ) {
    return null;
  }

  const id =
    firstNonEmpty(
      raw.profile_id,
      raw.id,
      raw._id,
      raw.title,
      raw.name
    );

  if (!id) {
    return null;
  }

  return {
    id: String(id),

    title:
      firstNonEmpty(
        raw.title,
        raw.name,
        raw.profile_name
      ) || 'Profile',

    desc:
      firstNonEmpty(
        raw.desc,
        raw.description,
        raw.summary
      ) || '',

    icon:
      raw.icon ||
      iconForCategory(
        raw.category
      )
  };
}

export function normalizeProfilesList(
  payload
) {
  const data = unwrap(payload);

  const items =
    Array.isArray(data)
      ? data
      : data?.profiles ||
        data?.items ||
        [];

  return items
    .map(normalizeProfile)
    .filter(Boolean);
}

// ---------------------------------------------------------------------
// Gemini Response
// ---------------------------------------------------------------------

export function normalizeGeminiResponse(payload) {
  const unwrapped =
    unwrap(payload) || {};

  const data =
    unwrapped?.result &&
    typeof unwrapped.result === 'object'
      ? unwrapped.result
      : unwrapped;

  console.log(
    '[Gemini] Normalized source data:',
    data
  );

  const replyText =
    firstNonEmpty(
      data.message,
      data.replyText,
      data.reply,
      data.answer,
      data.response,
      data.text,
      data.summary
    );

  const rawSchemes =
    firstNonEmpty(
      data.schemesArray,
      data.schemes,
      data.matchedSchemes
    ) || [];

  const schemesArray =
    asArray(rawSchemes)
      .filter(
        (scheme) =>
          scheme &&
          typeof scheme === 'object'
      )
      .map((scheme) => {
  // Convert Gemini's response shape into the DB shape before it
  // ever gets cached or normalized.
  const canonicalScheme =
    adaptGeminiScheme(scheme);

  const completeScheme =
    saveGeminiSchemeToCache(
      canonicalScheme
    );

  const schemeForCard =
    completeScheme || canonicalScheme;

  const normalized =
    normalizeScheme(
      schemeForCard
    );

        if (!normalized) {
          console.warn(
            '[Gemini] Scheme could not be normalized:',
            scheme
          );
        }

        return normalized;
      })
      .filter(Boolean);

  console.log(
    '[Gemini] Schemes for cards:',
    schemesArray
  );

  return {
    replyText:
      replyText ||
      'I can help with Indian Government schemes. Try asking about scholarships, pensions, housing, agriculture, education, or a specific scheme.',

    allowed:
      data.allowed === false
        ? false
        : true,

    schemesArray,

    /*
     * COMPLETE Gemini response.
     *
     * Translation and other components can use this.
     */
    rawResult: data
  };
}
// ---------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------

export function normalizeTranslationResponse(payload) {
  const data = unwrap(payload) || {};

  console.log(
    '[Translation Normalizer] Payload:',
    payload
  );

  console.log(
    '[Translation Normalizer] Unwrapped data:',
    data
  );

  /*
   * Your backend/Postman response is:
   *
   * {
   *   success: true,
   *   data: {
   *     allowed: true,
   *     language: "hi",
   *     query: "...",
   *     summary: "हिंदी अनुवाद..."
   *   }
   * }
   *
   * Therefore the translated chat text is data.summary.
   */

  const translatedText =
    firstNonEmpty(
      data.translatedText,
      data.translated_text,
      data.translation,
      data.translated,
      data.summary,
      data.text
    );

  return {
    translatedText:
      translatedText !== undefined &&
      translatedText !== null
        ? String(translatedText)
        : null,

    // Keep complete translated response available
    result: data
  };
}

// ---------------------------------------------------------------------
// Speech
// ---------------------------------------------------------------------

export function normalizeSpeechResponse(payload) {
  const data = unwrap(payload) || {};

  console.log(
    '[TTS Normalizer] Payload:',
    payload
  );

  console.log(
    '[TTS Normalizer] Unwrapped:',
    data
  );

  return {
    audioUrl:
      firstNonEmpty(
        data.audioUrl,
        data.audio_url,
        data.url
      ) || null,

    audioBase64:
      firstNonEmpty(
        data.audioBase64,
        data.audio_base64,
        data.audioContent,
        data.audio_content,
        data.base64,
        data.audio
      ) || null,

    mimeType:
      firstNonEmpty(
        data.mimeType,
        data.mime_type,
        data.contentType,
        data.content_type
      ) || 'audio/mpeg',

    transcript:
      firstNonEmpty(
        data.transcript,
        data.text
      ) || null
  };
}

// =====================================================================
// SCHEMES
// =====================================================================

export async function getSchemes(
  { signal, page = 1, limit = 500 } = {}
) {
  const payload =
    await getJson(
      `/api/schemes?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
      { signal }
    );

  return normalizeSchemesList(
    payload
  );
}

// ---------------------------------------------------------------------
// Cached total-scheme-count lookup
// ---------------------------------------------------------------------

let schemesCountPromise = null;

export function getSchemesCount() {
  if (!schemesCountPromise) {
    schemesCountPromise =
      getSchemes().then(
        ({ count }) => count,

        (err) => {
          schemesCountPromise = null;
          throw err;
        }
      );
  }

  return schemesCountPromise;
}

// ---------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------

export async function searchSchemes(
  query,
  { signal } = {}
) {
  const payload =
    await getJson(
      `/api/schemes/search?q=${encodeURIComponent(
        query
      )}`,
      { signal }
    );

  return normalizeSchemesList(
    payload
  );
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export async function getCategories(
  { signal } = {}
) {
  const payload =
    await getJson(
      '/api/schemes/categories',
      { signal }
    );

  return normalizeCategoriesList(
    payload
  );
}

// ---------------------------------------------------------------------
// Schemes by category
// ---------------------------------------------------------------------

export async function getSchemesByCategory(
  category,
  { signal } = {}
) {
  const payload =
    await getJson(
      `/api/schemes/category/${encodeURIComponent(
        category
      )}`,
      { signal }
    );

  return normalizeSchemesList(
    payload
  );
}

// =====================================================================
// SCHEME DETAIL
// =====================================================================
//
// IMPORTANT:
//
// 1. Try database first.
// 2. If database returns 400/404, try Gemini localStorage.
// 3. If cached Gemini scheme exists, use it.
// 4. Otherwise throw error.
//
// =====================================================================

export async function getSchemeById(
  schemeId,
  { signal } = {}
) {
  if (!schemeId) {
    throw new ApiError(
      'Scheme ID is required.',
      {
        status: 400
      }
    );
  }

  const requestedId =
    String(schemeId).trim();

  const encodedId =
    encodeURIComponent(requestedId);

  console.log(
    '[Scheme Detail] Requested ID:',
    requestedId
  );

  // ===============================================================
  // 1. CHECK GEMINI CACHE FIRST
  // ===============================================================
  //
  // Gemini-generated schemes are intentionally not stored in the
  // database. If this scheme exists in our temporary Gemini cache,
  // use it immediately.
  //

  console.log(
    '[Scheme Detail] Checking Gemini cache:',
    requestedId
  );

  const cachedScheme =
    getGeminiSchemeFromCache(
      requestedId
    );

  if (cachedScheme) {
    console.log(
      '[Scheme Detail] Gemini cached scheme found:',
      requestedId
    );

    const normalized =
      normalizeSchemeDetail(
      adaptGeminiScheme(cachedScheme)
    );

    if (normalized) {
      console.log(
        '[Scheme Detail] Gemini cache normalized successfully.'
      );

      return normalized;
    }

    console.warn(
      '[Scheme Detail] Cached Gemini scheme exists but could not be normalized:',
      cachedScheme
    );
  }

  // ===============================================================
  // 2. DATABASE
  // ===============================================================

  try {
    console.log(
      '[Scheme Detail] Trying database:',
      requestedId
    );

    const payload =
      await getJson(
        `/api/schemes/${encodedId}`,
        { signal }
      );

    const scheme =
      normalizeSchemeDetail(
        payload
      );

    if (scheme) {
      console.log(
        '[Scheme Detail] Database scheme found:',
        requestedId
      );

      return scheme;
    }

    console.log(
      '[Scheme Detail] Database returned no usable scheme.'
    );

  } catch (error) {
    console.warn(
      '[Scheme Detail] Database lookup failed:',
      {
        schemeId: requestedId,
        status: error?.status,
        message: error?.message
      }
    );

    if (
      error?.status !== 400 &&
      error?.status !== 404
    ) {
      throw error;
    }
  }

  // ===============================================================
  // 3. NOTHING FOUND
  // ===============================================================

  throw new ApiError(
    `Scheme "${requestedId}" was not found in the database or Gemini cache.`,
    {
      status: 404,
      data: {
        schemeId: requestedId
      }
    }
  );
}
// =====================================================================
// PROFILES
// =====================================================================

export async function getProfiles(
  { signal } = {}
) {
  const payload =
    await getJson(
      '/api/profiles',
      { signal }
    );

  return normalizeProfilesList(
    payload
  );
}

export async function getProfileById(
  profileId,
  { signal } = {}
) {
  const payload =
    await getJson(
      `/api/profiles/${encodeURIComponent(
        profileId
      )}`,
      { signal }
    );

  return normalizeProfile(
    unwrap(payload)
  );
}

// =====================================================================
// GEMINI AI
// =====================================================================

export async function askGemini({
  query,
  userId = 'guest',
  history = [],
  signal
}) {
  const payload =
    await postJson(
      '/api/gemini/ask',
      {
        message: query,
        history
      },
      {
        signal
      }
    );

  return normalizeGeminiResponse(
    payload
  );
}

// =====================================================================
// GEMINI SPEECH
// =====================================================================

export async function askGeminiSpeech({
  transcript,
  userId = 'guest',
  audioBlob,
  signal
}) {
  if (!audioBlob) {
    throw new Error('Audio is required');
  }

  const formData = new FormData();

  formData.append(
    'audio',
    audioBlob,
    'speech.webm'
  );

  formData.append(
    'userId',
    userId
  );

  if (transcript) {
    formData.append(
      'transcript',
      transcript
    );
  }

  const payload = await postFormData(
    '/api/gemini/speech-ask',
    formData,
    { signal }
  );

  return normalizeGeminiResponse(payload);
}

// =====================================================================
// TRANSLATION
// =====================================================================



export async function translateText({
  result,
  targetLanguage = 'hi',
  signal
}) {
  if (
    !result ||
    typeof result !== 'object'
  ) {
    throw new Error(
      'Translation result is required.'
    );
  }

  const body = {
    result,
    targetLanguage
  };

  console.log(
    '[Translation] Request body:',
    JSON.stringify(
      body,
      null,
      2
    )
  );

  try {
    const payload = await postJson(
      '/api/gemini/translate',
      body,
      { signal }
    );

    console.log(
      '[Translation] Raw response:',
      payload
    );

    const normalized =
      normalizeTranslationResponse(
        payload
      );

    console.log(
      '[Translation] Normalized response:',
      normalized
    );

    return normalized;
  } catch (error) {
    console.error(
      '[Translation] API failed:',
      error
    );

    console.error(
      '[Translation] Status:',
      error?.status
    );

    console.error(
      '[Translation] Message:',
      error?.message
    );

    console.error(
      '[Translation] Backend data:',
      error?.data
    );

    throw error;
  }
}

// =====================================================================
// TEXT TO SPEECH
// =====================================================================


export async function textToSpeech({
  text,
  signal
}) {
  const cleanText =
    typeof text === 'string'
      ? text.trim()
      : '';

  if (!cleanText) {
    throw new Error(
      'Text to speech requires non-empty text.'
    );
  }

  // ---------------------------------------------------------------
  // IMPORTANT:
  // Backend expects `result`, NOT `text`.
  //
  // This is especially important when ChatMessage sends the
  // translated Hindi text to TTS.
  // ---------------------------------------------------------------

  const body = {
    result: cleanText
  };

  console.log(
    '[TTS] Request body:',
    JSON.stringify(body, null, 2)
  );

  try {
    const payload =
      await postJson(
        '/api/gemini/speech-text',
        body,
        { signal }
      );

    console.log(
      '[TTS] Raw response:',
      payload
    );

    // Backend may return:
    //
    // {
    //   success: true,
    //   data: {
    //     audioBase64: "...",
    //     mimeType: "audio/mpeg"
    //   }
    // }
    //
    // or another supported audio format.

    const normalized =
      normalizeSpeechResponse(
        payload
      );

    console.log(
      '[TTS] Normalized response:',
      normalized
    );

    return normalized;

  } catch (error) {
    console.error(
      '[TTS] Request failed:',
      error
    );

    console.error(
      '[TTS] Status:',
      error?.status
    );

    console.error(
      '[TTS] Message:',
      error?.message
    );

    console.error(
      '[TTS] Backend data:',
      error?.data
    );

    throw error;
  }
}