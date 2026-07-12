// ============================================================================
//  google.ts — client-side Google Drive integration (no backend functions).
//
//  Uses the `drive.file` scope, which is NON-SENSITIVE: no Google app review
//  is required. The trade-off is the app can only touch files the teacher
//  explicitly picks in Google's own Picker window, plus files the app itself
//  creates (e.g. "Save as Google Doc"). That is exactly our use case.
//
//  Required env vars (set in Netlify, then redeploy — VITE_ vars bake at build):
//    VITE_GOOGLE_CLIENT_ID  — OAuth client "Socrates Web" (same Google Cloud
//                             project as Google login), with the site origins
//                             added under "Authorized JavaScript origins".
//    VITE_GOOGLE_API_KEY    — an API key from the same project (Picker API).
//    VITE_GOOGLE_APP_ID     — the Google Cloud PROJECT NUMBER (needed so the
//                             drive.file scope grants access to picked files).
//  Until these are set, `googleConfigured` is false and all Google Drive
//  buttons stay hidden — the rest of the app is unaffected.
// ============================================================================
import mammoth from 'mammoth';
import { pdfjs } from './pdf';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
const APP_ID = import.meta.env.VITE_GOOGLE_APP_ID as string | undefined;

/** True when the Google env vars are present — gates every Drive button. */
export const googleConfigured = Boolean(CLIENT_ID && API_KEY);

const SCOPE = 'https://www.googleapis.com/auth/drive.file';

export interface PickedFile { id: string; name: string; mimeType: string; }

// ---------------------------------------------------------------------------
// Script loading (Google Identity Services + Picker) — loaded on first use.
// ---------------------------------------------------------------------------
const scriptPromises: Record<string, Promise<void>> = {};
function loadScript(src: string): Promise<void> {
  if (!scriptPromises[src]) {
    scriptPromises[src] = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src; el.async = true;
      el.onload = () => resolve();
      el.onerror = () => { delete scriptPromises[src]; reject(new Error('Could not load Google scripts. Check your connection and try again.')); };
      document.head.appendChild(el);
    });
  }
  return scriptPromises[src];
}

async function ensureGis(): Promise<any> {
  await loadScript('https://accounts.google.com/gsi/client');
  return (window as any).google;
}

async function ensurePicker(): Promise<any> {
  await loadScript('https://apis.google.com/js/api.js');
  const gapi = (window as any).gapi;
  await new Promise<void>((resolve) => gapi.load('picker', () => resolve()));
  return (window as any).google;
}

// ---------------------------------------------------------------------------
// OAuth access token (popup consent; cached until shortly before it expires)
// ---------------------------------------------------------------------------
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(forceFresh = false): Promise<string> {
  if (!googleConfigured) throw new Error('Google Drive is not configured yet.');
  if (!forceFresh && cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const google = await ensureGis();
  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp: any) => {
        if (resp?.access_token) {
          // Refresh 5 minutes before Google's ~60-minute expiry.
          const ttl = (Number(resp.expires_in) || 3600) - 300;
          cachedToken = { token: resp.access_token, expiresAt: Date.now() + ttl * 1000 };
          resolve(resp.access_token);
        } else {
          reject(new Error(resp?.error === 'access_denied'
            ? 'Google access was declined.'
            : 'Could not connect to Google. Please try again.'));
        }
      },
      error_callback: (err: any) => {
        reject(new Error(err?.type === 'popup_closed'
          ? 'The Google sign-in window was closed.'
          : 'The Google sign-in popup was blocked — allow popups for this site and try again.'));
      },
    });
    client.requestAccessToken();
  });
}

// Retry a Drive API call once with a fresh token if the cached one was revoked.
async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getAccessToken();
  let resp = await fetch(url, { ...init, headers: { ...(init.headers as any), Authorization: `Bearer ${token}` } });
  if (resp.status === 401) {
    cachedToken = null;
    token = await getAccessToken(true);
    resp = await fetch(url, { ...init, headers: { ...(init.headers as any), Authorization: `Bearer ${token}` } });
  }
  return resp;
}

// ---------------------------------------------------------------------------
// Google Picker — the teacher chooses one file in Google's own window
// ---------------------------------------------------------------------------
export async function pickDriveFile(): Promise<PickedFile | null> {
  const token = await getAccessToken();
  const google = await ensurePicker();

  return new Promise<PickedFile | null>((resolve) => {
    const docsView = new google.picker.DocsView(google.picker.ViewId.DOCUMENTS); // Google Docs
    const filesView = new google.picker.DocsView()
      .setMimeTypes('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain');

    const builder = new google.picker.PickerBuilder()
      .setDeveloperKey(API_KEY)
      .setOAuthToken(token)
      .setOrigin(window.location.origin)
      .setTitle('Select an assignment')
      .addView(docsView)
      .addView(filesView)
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          resolve(doc ? { id: doc.id, name: doc.name, mimeType: doc.mimeType } : null);
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      });
    if (APP_ID) builder.setAppId(APP_ID); // project number: lets drive.file access the picked file
    builder.build().setVisible(true);
  });
}

// ---------------------------------------------------------------------------
// Read the picked file's text (Google Doc export, or PDF/DOCX/TXT download)
// ---------------------------------------------------------------------------
export async function readDriveFile(file: PickedFile): Promise<string> {
  if (file.mimeType === 'application/vnd.google-apps.document') {
    const resp = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`);
    if (!resp.ok) throw new Error('Could not read that Google Doc. Make sure you have access to it.');
    return resp.text();
  }

  const resp = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
  if (!resp.ok) throw new Error('Could not download that file from Google Drive.');

  if (file.mimeType === 'application/pdf') {
    const data = await resp.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  }
  if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const arrayBuffer = await resp.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  return resp.text();
}

// ---------------------------------------------------------------------------
// Create a Google Doc from HTML (Drive converts the HTML into Doc formatting)
// ---------------------------------------------------------------------------
export async function createGoogleDoc(title: string, html: string): Promise<{ id: string; url: string }> {
  const boundary = 'socratesiq-' + Date.now();
  const metadata = { name: title, mimeType: 'application/vnd.google-apps.document' };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n` +
    `--${boundary}--`;

  const resp = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }
  );
  if (!resp.ok) {
    let detail = 'Could not create the Google Doc.';
    try { const err = await resp.json(); if (err?.error?.message) detail += ` (${err.error.message})`; } catch {}
    throw new Error(detail);
  }
  const data = await resp.json();
  return { id: data.id, url: data.webViewLink || `https://docs.google.com/document/d/${data.id}/edit` };
}
