export interface TeacherProfile {
  name: string;
  email: string;
  /** Joined display string, e.g. "English / Language Arts, Mathematics" — kept for compatibility. */
  subject: string;
  /** Joined display string, e.g. "Middle School (6–8), High School (9–12)". */
  gradeLevel: string;
  /** Multi-select selections. Source of truth when present. */
  subjects?: string[];
  gradeLevels?: string[];
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

/** Ensure a profile has both the array fields and the joined strings, whichever it was saved with. */
function normalizeProfile(p: TeacherProfile): TeacherProfile {
  const subjects = p.subjects?.length ? p.subjects : (p.subject ? [p.subject] : []);
  const gradeLevels = p.gradeLevels?.length ? p.gradeLevels : (p.gradeLevel ? [p.gradeLevel] : []);
  return {
    ...p,
    subjects,
    gradeLevels,
    subject: subjects.join(', '),
    gradeLevel: gradeLevels.join(', '),
  };
}

export function loadProfile(): TeacherProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return normalizeProfile(JSON.parse(raw));
  } catch { return null; }
}

export function saveProfile(profile: TeacherProfile): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(normalizeProfile(profile))); }
  catch (e) { console.error('Failed to save profile:', e); }
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}
