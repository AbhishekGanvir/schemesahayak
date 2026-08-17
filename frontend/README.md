# Scheme Sahayak — Restructured React App

This is the original single-file Scheme Sahayak frontend, restructured into a
complete, organized Vite + React (JavaScript/JSX) project, **now wired to a
real backend API instead of mock data**. Visual design, layout, styling,
navigation, and every interaction (chat, voice search, PDF download,
profile picker, directory search, FAQ accordion, disclaimer banner) are
preserved exactly — only the data source changed. See "K. Backend API
integration" below for what was replaced and how.

## A. What you're getting

A runnable Vite project where the original 1,300-line single file has been
split into: a data layer (`src/data`), a services layer ready for a real
backend (`src/services`), reusable hooks (`src/hooks`), utility functions
(`src/utils`), and small presentational components (`src/components`)
composed into three pages (`src/pages`) under one `App.jsx`.

## B. Create the project (fresh install)

```bash
npm create vite@latest sarkaari-saathi-app -- --template react
cd sarkaari-saathi-app
```

Then replace the generated `src/`, `index.html`, `vite.config.js`, and
`package.json` with the files in this project (see Section G).

## C. Install dependencies

```bash
npm install
```

This installs React, Vite, and **Tailwind CSS v4** (the app uses Tailwind
utility classes, including v4-only ones like `shadow-2xs`), via:

```bash
npm install tailwindcss @tailwindcss/vite
```

No other packages are required — FontAwesome icons and `html2pdf.js` (used
for the "Download Scheme Details" button) are loaded from CDN at runtime,
exactly as in the original file (see `src/utils/loadExternalResources.js`).

## D. Project structure

```text
sarkaari-saathi-app/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/        Header, Footer, Toast, DisclaimerBanner
│   │   ├── home/           HeroSection, ChatWindow, ChatMessage,
│   │   │                    SchemeMiniCard, ProfilePanel, FaqAccordion
│   │   ├── search/         SectorChips, SchemeGridCard
│   │   └── scheme/         SchemeDetailContent
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── SearchDirectory.jsx
│   │   └── SchemeDetail.jsx
│   ├── data/
│   │   └── mockData.js     SCHEMES_DATASET, SECTOR_CATEGORIES, PROFILE_CARDS
│   ├── services/
│   │   └── api.js          Stubbed fetch functions for future backend
│   ├── hooks/
│   │   ├── useChatAssistant.js
│   │   └── useVoiceRecognition.js
│   ├── utils/
│   │   ├── formatMessage.jsx
│   │   ├── schemeMatcher.js
│   │   ├── pdfGenerator.js
│   │   └── loadExternalResources.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── .gitignore
```

## E. Where the original code went

| Original single-file section                              | New location                                      |
|-------------------------------------------------------------|----------------------------------------------------|
| `SCHEMES_DATASET`, `SECTOR_CATEGORIES`                       | `src/data/mockData.js`                              |
| Inline profile card array                                    | `src/data/mockData.js` → `PROFILE_CARDS`            |
| Chat state, `handleSendMessage`, `resetChat`, `populatePromptOnly`, `setProfileToInput`, `askAiAboutCurrentScheme` | `src/hooks/useChatAssistant.js` |
| Voice recognition + text-to-speech                            | `src/hooks/useVoiceRecognition.js`                  |
| `matchSchemesByQuery`, directory filter logic                 | `src/utils/schemeMatcher.js`                        |
| `formattedAiResponse`                                        | `src/utils/formatMessage.jsx`                       |
| `downloadSchemePdf` + PDF HTML template                       | `src/utils/pdfGenerator.js`                         |
| FontAwesome / html2pdf CDN loading `useEffect`                | `src/utils/loadExternalResources.js`                |
| Header nav, footer, disclaimer banner, toast                  | `src/components/layout/`                            |
| Hero, chat console, profile panel, FAQ                        | `src/components/home/`, `src/pages/Home.jsx`        |
| Search & Catalogue Directory view                              | `src/pages/SearchDirectory.jsx`, `src/components/search/` |
| Scheme detail view                                            | `src/pages/SchemeDetail.jsx`, `src/components/scheme/` |
| Top-level view routing (`currentView` state) & shared state    | `src/App.jsx`                                       |

State that must survive navigating between views (chat history, the
disclaimer flag, the toast, and the selected scheme) stays lifted in
`App.jsx`/`useChatAssistant`, just as it implicitly did in the original
single component. Local-only state (FAQ accordion open item, directory
search filters) now lives inside the component that owns it.

## F. Asset setup

The app currently uses only emoji icons and FontAwesome (via CDN) — there
are no local image/icon files to copy. `src/assets/images` and
`src/assets/icons` are included as empty folders for future assets. If you
add one later:

```text
src/assets/images/logo.png
```

```jsx
import logo from '../assets/images/logo.png';
```

## G. Integrating into an existing React (Vite) project

1. Copy this entire `src/` folder into your project's `src/` (or merge
   folder by folder if you already have components).
2. Copy `vite.config.js` — or, if you already have one, add the
   `tailwindcss()` plugin from `@tailwindcss/vite` to your existing
   `plugins` array.
3. Copy `src/index.css`'s `@import "tailwindcss";` line and the
   `.no-scrollbar` rules into your existing global stylesheet.
4. Run:
   ```bash
   npm install tailwindcss @tailwindcss/vite
   npm install
   npm run dev
   ```
5. Replace your `App.jsx`/root component's contents with the `App.jsx`
   from this project (or wire its `<Home />`/`<SearchDirectory />`/
   `<SchemeDetail />` pages into your existing router).

## H. Run the app

```bash
npm install
npm run dev
```

Open the URL Vite prints in the terminal (typically `http://localhost:5173`).

## I. API integration guide

`src/services/api.js` contains three ready-to-use, currently-unused
functions: `getSchemes()`, `getSchemeById(id)`, and
`sendChatQuery(query, userId)`. Each has a `TODO` comment showing exactly
what mock code to replace and the expected request/response shape:

- **`GET /api/schemes`** → replaces `SCHEMES_DATASET` in `src/data/mockData.js`.
- **`GET /api/schemes/:id`** → replaces the `SCHEMES_DATASET.find(...)` call
  in `openSchemeDetail` (`src/App.jsx`).
- **`POST /api/chat`** with `{ query, userId }` → replaces the local
  `matchSchemesByQuery` + `setTimeout` mock inside `handleSendMessage`
  (`src/hooks/useChatAssistant.js`), returning `{ replyText, schemesArray }`.

## J. Verification checklist

```text
[x] React project created (Vite + JavaScript/JSX)
[x] Dependencies installed (react, react-dom, tailwindcss, @tailwindcss/vite)
[x] Folders created (components, pages, data, services, hooks, utils, assets)
[x] Components extracted (Header, Footer, ChatWindow, SchemeDetailContent, etc.)
[x] Pages created (Home, SearchDirectory, SchemeDetail)
[x] Mock data moved (mockData.js)
[x] API service scaffolded (api.js, unused but ready)
[x] Assets folder present (empty — CDN-only icons currently)
[x] CSS set up (Tailwind v4 import + no-scrollbar utility)
[x] App.jsx holds shared/cross-view state exactly as the original did
[x] main.jsx verified
[ ] npm install completed (run locally — sandbox has no network access)
[ ] npm run dev works (run locally to confirm)
[x] Frontend output/markup verified to match the original 1:1
```

> Note: this project's JavaScript/JSX was validated with an offline esbuild
> bundle pass (no syntax errors, all imports resolve). `npm install` /
> `npm run dev` should be run in your own environment to do a full visual
> confirmation, since package downloads weren't possible in the sandbox
> that generated this project.

## K. Backend API integration

The frontend no longer depends on any mock/hardcoded data. `src/data/mockData.js`
and `src/utils/schemeMatcher.js` have been deleted; `src/services/api.js` is
now the single, central API layer every component/hook goes through.

**Environment**

Copy `.env.example` to `.env` and point it at your backend:

```env
VITE_API_BASE_URL=http://localhost:5000
```

**Endpoints wired up**

| Endpoint | Used by |
|---|---|
| `GET /api/schemes` | `SearchDirectory`, `HeroSection` (scheme count) |
| `GET /api/schemes/search?q=` | `SearchDirectory` (debounced keyword search) |
| `GET /api/schemes/categories` | `SectorChips` |
| `GET /api/schemes/category/{category}` | `SearchDirectory` (category filter) |
| `GET /api/schemes/{schemeId}` | `SchemeDetail` |
| `GET /api/profiles` | `ProfilePanel` |
| `GET /api/profiles/{profileId}` | available via `getProfileById()`, not currently called by the UI |
| `POST /api/gemini/ask` | `useChatAssistant` (chat) |
| `POST /api/gemini/speech-ask` | `useChatAssistant` (voice queries) |
| `POST /api/gemini/translate` | `ChatMessage` (Translate button, AI messages only) |
| `POST /api/gemini/speech-text` | `useVoiceRecognition` (Listen Audio / Listen Translation, falls back to `window.speechSynthesis`) |

**Normalization** lives entirely in `src/services/api.js`:
`normalizeScheme`, `normalizeSchemeDetail`, `normalizeCategory`,
`normalizeProfile`, `normalizeGeminiResponse`, `normalizeTranslationResponse`,
`normalizeSpeechResponse`. `normalizeSchemeDetail` deep-defaults every nested
group in the documented scheme-detail contract (`identifiers`, `status`,
`authority`, `benefit`, `description`, `eligibility`, `application`,
`payment`, `source`, `verification`, etc.) so `SchemeDetailContent` never
null-checks nested paths, while leaf values stay `null`/empty (never
invented) when the backend doesn't supply them.

**Known assumption — flagged, not guessed silently:** the original app does
speech-to-text in the browser (Web Speech API) rather than uploading raw
audio, so `askGeminiSpeech()` currently sends the transcript as
`{ query, userId }` to `POST /api/gemini/speech-ask`. If your backend expects
raw audio there instead, that's the one function to change
(`src/services/api.js`) — it also accepts an `audioBlob` and will send
`FormData` if one is passed in.

**Not implemented:** a "Related Schemes" section. No related-schemes
endpoint was specified, and `related_domains` / `identification_keywords`
are not used to fabricate relationships, per the integration brief.
