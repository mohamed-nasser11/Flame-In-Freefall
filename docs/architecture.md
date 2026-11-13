# Architecture

EMBER is a single-page React application with one serverless function. Everything except the language-model call runs in the browser from two JSON files, so the core product works offline from the model provider.

## Modules

| Path | Responsibility |
| --- | --- |
| `src/lib/data.ts` | Loads `findings.json` and `flammability.json`, exposes typed records, labels and derived statistics |
| `src/lib/search.ts` | BM25 index over findings and reference limits, with field weights and domain synonyms |
| `src/lib/coverage.ts` | Compares a cabin atmosphere with the tested conditions (`within`, `edge`, `outside`) |
| `src/lib/risk.ts` | Mission Risk Check rules, validation and ranking |
| `src/lib/assistant.ts` | Request validation, retrieval for the assistant, evidence block, citation enforcement, fallbacks |
| `api/ask.ts` | Vercel function: rate limit, call the model, return a structured answer |

`src/lib` has no browser or React dependencies, so the same code runs in the page, in the API function and in the tests.

## Mission Risk Check

1. **Validate** the scenario (ranges for oxygen, pressure and ventilation; minimum not above maximum).
2. **Coverage**: look for solid-material flight tests within 1.5 points of O2 and 15 kPa of pressure. If there are none, the brief says the scenario is outside the tested range.
3. **Rules**: each rule checks one condition and returns a review item with the factors that triggered it, a comparison with the closest NASA test, a question for the engineering team and its evidence ids.
4. **Rank**: tier first (*Review first*, *Review*, *Note*), then evidence gaps, then the strongest supporting evidence, then the number of matched factors.

The output separates four kinds of statement: documented results (the evidence list), similarity to a test (the comparison), interpretation (the item title and the team's safety notes), and suggested questions for the engineer.

## Ask EMBER

1. `validateAskRequest` checks types and lengths and keeps the last six turns of history.
2. `retrieve` runs BM25 over the knowledge base. Short follow-up questions are also matched together with the previous question.
3. With no hits, the API returns the fixed insufficient-evidence message without calling the model.
4. The model receives only the retrieved records and a strict system prompt: cite a record id after every factual sentence, keep objectives and hypotheses labelled, reply `INSUFFICIENT_EVIDENCE` when the records do not answer.
5. `enforceCitations` removes any id that is not in the retrieved set; the response lists only cited records with their source URL and location.
6. Missing API key, provider errors and refusals all fall back to a records-only answer.

The function applies a per-IP rate limit (12 requests per minute per instance), never forwards stack traces, and logs one structured JSON line per request.

## Why not embeddings and a vector database

The knowledge base is 37 short records. Keyword ranking with synonyms retrieves the right records for the questions in the test suite, can be inspected by reading the matched terms, and keeps the deployment to one free static site plus one function. If the corpus grows to full report text, the `search` function is the single place to swap in hybrid retrieval.
