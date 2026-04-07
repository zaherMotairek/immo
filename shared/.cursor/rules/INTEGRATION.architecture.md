Integration Architecture — Contracts → API Client → Services → UI

Purpose
- Define a repeatable, minimal integration pattern any project can adopt.
- Keep responsibilities cleanly separated so teams can extend safely.

High-level Pattern
1) Contracts (shared): single source of truth for DTOs and public types.
2) API Client (frontend): one gateway for HTTP concerns (base URL, headers, retries, errors).
3) Services (frontend): domain-oriented functions calling the API client.
4) UI (frontend): components call services; no fetch/HTTP logic in components.

Directory Convention (example)
```
shared/
  contracts/
    src/
      auth.ts
      user.ts
      index.ts
    dist/
    package.json

frontend/
  src/
    lib/
      apiClient.ts
    services/
      auth.ts
      user.ts
      metadata.ts
    pages/
      Auth/
        SignIn.jsx
```

1) Contracts (shared/contracts)
- What: Type-only package exposing request/response DTOs and shared enums.
- Why: Eliminate drift between backend and frontend; improve autocompletion & safety.
- How:
  - Author types in `src/*.ts` (e.g., `LoginRequest`, `TokenPair`, `UserProfile`).
  - Re-export via `src/index.ts`.
  - Build to `dist` and version the package (semver). Consumers import from the package name.

2) API Client (frontend/src/lib/apiClient.ts)
- What: Minimal wrapper around `fetch` (or axios) that centralizes concerns:
  - Base URL handling
  - Auth header injection (if applicable)
  - Typed errors with HTTP status
  - Optional single retry on 401 via a refresh flow
  - JSON serialization and 204 handling
- Why: Keep networking consistent and testable; avoid duplicating headers and error parsing.
- Interface recommendations:
  - `apiFetch<T>(path: string, init?: RequestInit): Promise<T>`
  - `setTokens`, `clearTokens` (if auth is token-based)

3) Services (frontend/src/services/*)
- What: Domain modules that encapsulate API calls using the API client.
- Why: Keep UI declarative and testable; allow easy mocking in tests.
- Rules:
  - One service per domain (e.g., `user.ts`, `plan.ts`, `metadata.ts`).
  - Export simple functions with typed params/returns using shared contract types.
  - Map UI form models → contract DTOs explicitly; keep transformations out of components.

Example Service
```ts
// frontend/src/services/example.ts
import { apiFetch } from '../lib/apiClient'
import type { ExampleRequest, ExampleResponse } from '@contracts/example'

export async function doExample(input: ExampleRequest): Promise<ExampleResponse> {
  return apiFetch('/example', { method: 'POST', body: JSON.stringify(input) })
}
```

4) UI (pages/components)
- What: Presentation and local interaction only.
- Why: Maintain clarity; no coupling to HTTP or server specifics.
- Rules:
  - Never call `fetch` directly; only call service functions.
  - Handle optimistic UI, loading, and error display locally or via hooks.

Example UI usage
```jsx
// frontend/src/pages/AnyPage.jsx
import { useState } from 'react'
import { doExample } from '../../services/example'

export function AnyPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await doExample({ payload: 'value' })
      // navigate or show success
    } catch (err) {
      // show toast/banner
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>{/* fields & button */}</form>
  )
}
```

Error Handling Model
- API client throws typed `ApiError { status, code?, details? }`.
- Services may translate server errors to UI-friendly messages.
- UI shows a human message and optional retry; avoid leaking server internals.

Auth Optionality
- If the app uses auth, keep token logic in the API client; expose `setTokens/clearTokens`.
- Do not store refresh tokens in long-lived JS storage; prefer httpOnly cookies or ephemeral memory.

Extending the System (minimal checklist)
- Add or update contract types in `shared/contracts`; rebuild and bump version.
- Implement/adjust backend endpoints to match contracts (controller/service layer).
- Add a service function in `frontend/src/services/*` using `apiClient`.
- Wire the UI to call the service in event handlers (e.g., `handleSubmit`).
- Smoke test with cURL/Postman and through the UI.

Quality Bar
- Components are presentational; no data access.
- Services are pure and typed; minimal transformation.
- API client is the only network gateway; consistent errors and headers.
- Contracts are authoritative; no ad-hoc frontend type definitions for server payloads.


