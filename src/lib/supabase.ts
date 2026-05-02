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

export interface Department {
  id: string; name: string; school_name: string; created_by: string; invite_code: string; created_at: string;
}

export interface DepartmentMember {
  id: string; department_id: string; user_id: string; user_name: string; user_email: string; role: 'head' | 'member'; joined_at: string;
}

export interface SharedAssignment {
  id: string; department_id: string; assignment_id: string; shared_by: string; shared_by_name: string;
  title: string; full_text: string; status: string; resilience: number; note: string; created_at: string;
}

export async function createDepartment(name: string, schoolName: string, userId: string, userName: string) {
  const sb = await getClient();
  if (!sb) return null;
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await sb.from('departments').insert({ name, school_name: schoolName, created_by: userId, invite_code: inviteCode }).select().single();
  if (error) { console.error('Create dept error:', error); return null; }
  await sb.from('department_members').insert({ department_id: data.id, user_id: userId, user_name: userName, user_email: '', role: 'head' });
  return data as Department;
}

export async function joinDepartment(inviteCode: string, userId: string, userName: string, userEmail: string) {
  const sb = await getClient();
  if (!sb) return null;
  const { data: dept } = await sb.from('departments').select('*').eq('invite_code', inviteCode.toUpperCase()).single();
  if (!dept) return { error: 'Invalid invite code' };
  const { error } = await sb.from('department_members').insert({ department_id: dept.id, user_id: userId, user_name: userName, user_email: userEmail, role: 'member' });
  if (error && error.code !== '23505') return { error: error.message };
  return { department: dept as Department };
}

export async function getUserDepartments(userId: string): Promise<Department[]> {
  const sb = await getClient();
  if (!sb) return [];
  const { data } = await sb.from('department_members').select('department_id, departments(*)').eq('user_id', userId);
  if (!data) return [];
  return data.map((d: any) => d.departments).filter(Boolean) as Department[];
}

export async function getDepartmentMembers(deptId: string): Promise<DepartmentMember[]> {
  const sb = await getClient();
  if (!sb) return [];
  const { data } = await sb.from('department_members').select('*').eq('department_id', deptId);
  return (data || []) as DepartmentMember[];
}

export async function shareAssignmentToDept(deptId: string, assignment: { id: string; title: string; fullText: string; status: string; resilience: number }, userId: string, userName: string, note: string) {
  const sb = await getClient();
  if (!sb) return null;
  const { data, error } = await sb.from('shared_assignments').insert({ department_id: deptId, assignment_id: assignment.id, shared_by: userId, shared_by_name: userName, title: assignment.title, full_text: assignment.fullText, status: assignment.status, resilience: assignment.resilience, note }).select().single();
  if (error) { console.error('Share error:', error); return null; }
  return data as SharedAssignment;
}

export async function getDeptSharedAssignments(deptId: string): Promise<SharedAssignment[]> {
  const sb = await getClient();
  if (!sb) return [];
  const { data } = await sb.from('shared_assignments').select('*').eq('department_id', deptId).order('created_at', { ascending: false });
  return (data || []) as SharedAssignment[];
}
