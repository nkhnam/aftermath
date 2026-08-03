# AfterMath

AfterMath is a bilingual Vietnamese/English financial pre-mortem simulator. Its deterministic TypeScript engine is the only source of truth for calculations, risk scoring, timelines, stress tests, and escape-route optimization.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Quality gates:

```bash
npm test
npm run lint
npm run build
```

## Optional Qwen 3.7 Plus explanation layer

The server-side provider uses Alibaba Cloud model `qwen3.7-plus`. Qwen only converts verified structured results into concise prose. It does not calculate scores, choose critical months, or select optimizer routes. The application automatically uses the localized deterministic provider when the API key is absent, the request times out, the provider fails, or output does not pass schema validation.

Copy `.env.example` to `.env.local` and set the server-only variable if Qwen enhancement is desired:

```dotenv
DASHSCOPE_API_KEY=your_server_side_key
```

Never prefix this variable with `NEXT_PUBLIC_`. The key is read only by `src/app/api/explain/route.ts` and must be configured as a server-side environment variable on the deployment platform. The browser sends only sanitized financial scenario values and calculated results; scenario names and personal notes are excluded.

## Deployment

Deploy to a platform that supports Next.js App Router Route Handlers. Configure `DASHSCOPE_API_KEY` in the platform's encrypted server-side environment settings, then run `npm run build`. The product remains fully functional without this variable and does not automatically call Qwen during the cinematic flow.
