import { SavedAssignment } from '../App';
import { FrameworkDimension, DEFAULT_DIMENSIONS, BloomsLevel } from './gemini';

const KEYS = {
  ASSIGNMENTS: 'socrates_assignments',
  SETTINGS: 'socrates_settings',
  USER: 'socrates_user',
};

export interface AppSettings {
  activeFramework: 'triple-a' | 'blooms';
  defaultPreference: 'avoid' | 'augment' | 'embrace';
  bloomsLevel: BloomsLevel;
  dimensions: FrameworkDimension[];
}

const DEFAULT_SETTINGS: AppSettings = {
  activeFramework: 'triple-a',
  defaultPreference: 'avoid',
  bloomsLevel: 'Analyze',
  dimensions: DEFAULT_DIMENSIONS,
};

export function loadAssignments(): SavedAssignment[] {
  try {
    const raw = localStorage.getItem(KEYS.ASSIGNMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveAssignments(assignments: SavedAssignment[]): void {
  try { localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments)); }
  catch (e) { console.error('Failed to save assignments:', e); }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(settings: AppSettings): void {
  try { localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings)); }
  catch (e) { console.error('Failed to save settings:', e); }
}

export interface StoredUser {
  name: string;
  email: string;
}

export function loadUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(KEYS.USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveUser(user: StoredUser): void {
  try { localStorage.setItem(KEYS.USER, JSON.stringify(user)); }
  catch (e) { console.error('Failed to save user:', e); }
}

export function clearUser(): void {
  localStorage.removeItem(KEYS.USER);
}
