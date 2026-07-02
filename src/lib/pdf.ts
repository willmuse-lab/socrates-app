// Central pdf.js setup. The worker is bundled with the app (via Vite's ?url
// import) instead of being fetched from a CDN — CDN paths broke because
// pdf.js v4 ships the worker as .mjs, and external fetches can be blocked.
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore — Vite resolves ?url imports at build time
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };
