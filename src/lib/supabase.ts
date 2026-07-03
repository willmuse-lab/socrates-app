const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

let _supabase: any = null;

async function getClient() {
  if (!supabaseEnabled) return null;
  if (_supabase) return _supabase;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _supabase;
  } catch (e) {
    console.warn('Supabase not available');
    return null;
  }
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const sb = await getClient();
  if (!sb) return { error: new Error('Supabase not configured') };
  return await sb.auth.signUp({ email, password, options: { data: { name } } });
}

export async function signInWithEmail(email: string, password: string) {
  const sb = await getClient();
  if (!sb) return { error: new Error('Supabase not configured') };
  return await sb.auth.signInWithPassword({ email, password });
}

export async function signInWithProvider(provider: 'google' | 'azure') {
  const sb = await getClient();
  if (!sb) return { error: new Error('Supabase not configured') };
  return await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
      // Microsoft/Azure needs the scopes spelled out to return the user's email + name.
      ...(provider === 'azure' ? { scopes: 'email openid profile' } : {}),
    },
  });
}

export async function signOut() {
  const sb = await getClient();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function onAuthStateChange(callback: (user: any) => void) {
  const sb = await getClient();
  if (!sb) return () => {};
  const { data: { subscription } } = sb.auth.onAuthStateChange((_event: any, session: any) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

export async function fetchAssignmentsFromCloud(userId: string) {
  const sb = await getClient();
  if (!sb) return null;
  const { data, error } = await sb.from('assignments').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('Fetch error:', error); return null; }
  return data.map((row: any) => ({
    id: row.id, title: row.title, fullText: row.full_text,
    status: row.status, resilience: row.resilience,
    date: new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }));
}

export async function saveAssignmentToCloud(userId: string, assignment: { id: string; title: string; fullText: string; status: string; resilience: number }) {
  const sb = await getClient();
  if (!sb) return null;
  const { data, error } = await sb.from('assignments').upsert({ id: assignment.id, user_id: userId, title: assignment.title, full_text: assignment.fullText, status: assignment.status, resilience: assignment.resilience });
  if (error) { console.error('Save error:', error); return null; }
  return data;
}

export async function deleteAssignmentFromCloud(id: string) {
  const sb = await getClient();
  if (!sb) return;
  await sb.from('assignments').delete().eq('id', id);
}

export interface ResearchPaper {
  id: string; title: string; authors: string; year: string; filename: string; content: string; created_at: string;
}

export async function fetchResearchPapers(): Promise<ResearchPaper[]> {
  const sb = await getClient();
  if (!sb) return [];
  const { data, error } = await sb.from('research_papers').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Fetch research error:', error); return []; }
  return data || [];
}

export async function saveResearchPaper(paper: Omit<ResearchPaper, 'id' | 'created_at'>) {
  const sb = await getClient();
  if (!sb) return null;
  const { data, error } = await sb.from('research_papers').insert(paper).select().single();
  if (error) { console.error('Save research error:', error); return null; }
  return data;
}

export async function deleteResearchPaper(id: string) {
  const sb = await getClient();
  if (!sb) return;
  await sb.from('research_papers').delete().eq('id', id);
}
