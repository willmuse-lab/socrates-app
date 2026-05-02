export interface TeacherProfile {
  name: string;
  email: string;
  subject: string;
  gradeLevel: string;
  schoolName: string;
  schoolType: 'public' | 'private' | 'charter' | 'higher-ed' | '';
  country: string;
  onboardingComplete: boolean;
}

export const SUBJECTS = [
  'English / Language Arts',
  'Mathematics',
  'Science',
  'History / Social Studies',
  'Foreign Language',
  'Art / Music / Drama',
  'Physical Education',
  'Computer Science',
  'Philosophy / Ethics',
  'Economics',
  'Psychology',
  'Other',
];

export const GRADE_LEVELS = [
  'Elementary (K–5)',
  'Middle School (6–8)',
  'High School (9–12)',
  'Higher Education',
  'Mixed / Multiple',
];

const PROFILE_KEY = 'socrates_teacher_profile';

export function loadProfile(): TeacherProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveProfile(profile: TeacherProfile): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
  catch (e) { console.error('Failed to save profile:', e); }
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}
