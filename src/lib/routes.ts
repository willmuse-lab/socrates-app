// Real URLs for the pages that need to be reachable from outside the app.
//
// Every page used to live only in React state (`viewMode` in App.tsx) and the
// app always booted to the studio, so https://socratesiq.com/privacy loaded the
// analyzer rather than the privacy policy. Google's OAuth verification requires
// a privacy-policy URL that actually shows the privacy policy — reviewers do
// follow the link — so there was nothing we could submit.
//
// Only self-contained public pages get a path. 'report' needs a report already
// loaded in memory, and the admin views are deliberately not advertised, so
// those stay state-only and leave the URL alone.

export type RoutedView =
  | 'studio' | 'library' | 'pricing' | 'about'
  | 'privacy' | 'scoring' | 'terms' | 'feedback' | 'help';

const VIEW_TO_PATH: Record<RoutedView, string> = {
  studio: '/',
  library: '/library',
  pricing: '/pricing',
  about: '/about',
  privacy: '/privacy',
  scoring: '/scoring',
  terms: '/terms',
  feedback: '/feedback',
  help: '/help',
};

const PATH_TO_VIEW: Record<string, RoutedView> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH).map(([view, path]) => [path, view as RoutedView]),
) as Record<string, RoutedView>;

/** Strip a trailing slash so /privacy and /privacy/ are the same page. */
function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname || '/';
}

/** The URL for a view, or null for views that stay out of the address bar. */
export function pathForView(view: string): string | null {
  return VIEW_TO_PATH[view as RoutedView] ?? null;
}

/** The view for a URL. Anything unrecognised falls back to the studio. */
export function viewForPath(pathname: string): RoutedView {
  return PATH_TO_VIEW[normalize(pathname)] ?? 'studio';
}

/** Whether this URL names a real page (used to normalise junk paths once). */
export function isKnownPath(pathname: string): boolean {
  return normalize(pathname) in PATH_TO_VIEW;
}

/**
 * True when a link click should be handled in-app rather than by the browser.
 * Modified clicks (new tab, new window, middle button) are left alone so the
 * nav behaves like real links, which is the point of using <a> at all.
 * Typed structurally so this file stays free of React imports.
 */
export function isPlainLeftClick(e: {
  metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button: number;
}): boolean {
  return !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0;
}
