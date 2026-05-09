import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, ArrowLeft, Copy, Check, Share2, BookOpen, ShieldCheck, Clock, Crown, UserPlus, AlertCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createDepartment, joinDepartment, getUserDepartments, getDepartmentMembers, shareAssignmentToDept, getDeptSharedAssignments, Department, DepartmentMember, SharedAssignment, supabaseEnabled } from '@/src/lib/supabase';
import { SavedAssignment } from '../App';

interface DepartmentViewProps {
  user: { name: string; email: string; id?: string } | null;
  savedAssignments: SavedAssignment[];
  onBack: () => void;
  onOpenAssignment: (a: SavedAssignment) => void;
}

type DeptView = 'list' | 'create' | 'join' | 'department';

export function DepartmentView({ user, savedAssignments, onBack, onOpenAssignment }: DepartmentViewProps) {
  const [view, setView] = useState<DeptView>('list');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [sharedAssignments, setSharedAssignments] = useState<SharedAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [shareTarget, setShareTarget] = useState<SavedAssignment | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => { if (user?.id) loadDepartments(); }, [user]);

  const loadDepartments = async () => {
    if (!user?.id) return;
    setLoading(true);
    const depts = await getUserDepartments(user.id);
    setDepartments(depts);
    setLoading(false);
  };

  const loadDepartmentData = async (dept: Department) => {
    setLoading(true);
    const [m, s] = await Promise.all([getDepartmentMembers(dept.id), getDeptSharedAssignments(dept.id)]);
    setMembers(m); setSharedAssignments(s); setLoading(false);
  };

  const handleOpenDept = async (dept: Department) => {
    setActiveDept(dept); setView('department');
    await loadDepartmentData(dept);
  };

  const handleCreate = async () => {
    if (!user?.id || !deptName.trim()) return;
    setLoading(true);
    const dept = await createDepartment(deptName, schoolName, user.id, user.name);
    if (dept) { toast.success(`Department "${deptName}" created!`); await loadDepartments(); setDeptName(''); setSchoolName(''); setView('list'); }
    else { toast.error('Failed to create department.'); }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user?.id || !inviteCode.trim()) return;
    setLoading(true);
    const result = await joinDepartment(inviteCode, user.id, user.name, user.email);
    if (result && 'error' in result) { toast.error(result.error || 'Invalid invite code'); }
    else if (result) { toast.success(`Joined!`); await loadDepartments(); setInviteCode(''); setView('list'); }
    setLoading(false);
  };

  const handleShare = async () => {
    if (!user?.id || !shareTarget || !activeDept) return;
    setLoading(true);
    const result = await shareAssignmentToDept(activeDept.id, shareTarget, user.id, user.name, shareNote);
    if (result) { toast.success('Assignment shared!'); setShowShareModal(false); setShareNote(''); setShareTarget(null); await loadDepartmentData(activeDept); }
    else { toast.error('Failed to share.'); }
    setLoading(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code); setCopiedCode(true);
    toast.success('Invite code copied!'); setTimeout(() => setCopiedCode(false), 2000);
  };

  const scoreColor = (score: number) => score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-500';

  if (!supabaseEnabled) return (
    <div className="max-w-2xl mx-auto p-10 space-y-6">
      <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
      <Card className="p-8 border border-amber-200 bg-amber-50 space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-600" />
        <h3 className="font-bold text-lg">Supabase required for departments</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Netlify environment variables, then run the department SQL schema from SETUP.md.</p>
      </Card>
    </div>
  );

  if (view === 'department' && activeDept) {
    const isHead = members.find(m => m.user_id === user?.id)?.role === 'head';
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div>
            <button onClick={() => setView('list')} className="text-xs text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"><ArrowLeft className="w-3 h-3" />All departments</button>
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-accent" />
              <h1 className="text-3xl font-bold font-serif italic">{activeDept.name}</h1>
              {isHead && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]"><Crown className="w-3 h-3 mr-1" />Head</Badge>}
            </div>
            {activeDept.school_name && <p className="text-muted-foreground text-sm mt-1">{activeDept.school_name}</p>}
          </div>
          <div className="flex items-center gap-3">
            {isHead && (
              <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground">Invite code:</span>
                <code className="text-sm font-bold tracking-widest text-accent">{activeDept.invite_code}</code>
                <button onClick={() => copyCode(activeDept.invite_code)}>{copiedCode ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}</button>
              </div>
            )}
            <Button onClick={onBack} variant="outline">Back to Studio</Button>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid md:grid-cols-[1fr_240px] gap-8">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Shared assignments</h2>
                <Button size="sm" className="gap-2 text-xs" onClick={() => setShowShareModal(true)}><Share2 className="w-3.5 h-3.5" />Share an assignment</Button>
              </div>
              {sharedAssignments.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center space-y-3 border-2 border-dashed border-border rounded-xl">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                  <p className="font-bold">No shared assignments yet</p>
                  <Button size="sm" onClick={() => setShowShareModal(true)} className="gap-2"><Share2 className="w-3.5 h-3.5" />Share now</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sharedAssignments.map((sa, i) => (
                    <motion.div key={sa.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="p-5 border border-border hover:border-accent/30 transition-all group">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate group-hover:text-accent transition-colors">{sa.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[11px] text-muted-foreground">Shared by <strong>{sa.shared_by_name}</strong></span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(sa.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-bold flex items-center gap-1 ${scoreColor(sa.resilience)}`}><ShieldCheck className="w-3.5 h-3.5" />{sa.resilience}</span>
                          </div>
                        </div>
                        {sa.note && <div className="bg-secondary/30 rounded-lg px-3 py-2 mb-3"><p className="text-xs text-muted-foreground italic">"{sa.note}"</p></div>}
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{sa.full_text?.substring(0, 150)}…</p>
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5"
                          onClick={() => onOpenAssignment({ id: sa.assignment_id, title: sa.title, fullText: sa.full_text, status: sa.status as any, resilience: sa.resilience, date: new Date(sa.created_at).toLocaleDateString() })}>
                          <BookOpen className="w-3 h-3" />Open in Studio
                        </Button>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Members ({members.length})</h2>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                      {m.user_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.user_name}</p>
                      {m.role === 'head' && <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider flex items-center gap-0.5"><Crown className="w-2.5 h-2.5" />Head</span>}
                    </div>
                  </div>
                ))}
              </div>
              {isHead && (
                <div className="pt-3 border-t border-border space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Invite teachers</p>
                  <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                    <code className="text-sm font-bold tracking-widest text-accent flex-1">{activeDept.invite_code}</code>
                    <button onClick={() => copyCode(activeDept.invite_code)}>{copiedCode ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}</button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Teachers enter this code under "Join a department"</p>
                </div>
              )}
            </div>
          </div>
        )}
        <AnimatePresence>
          {showShareModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-card border border-border rounded-2xl p-8 w-full max-w-md space-y-5" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold font-serif italic">Share with {activeDept.name}</h3>
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Select an assignment</Label>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {savedAssignments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No saved assignments yet.</p>
                      : savedAssignments.map(a => (
                        <button key={a.id} onClick={() => setShareTarget(a)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${shareTarget?.id === a.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium truncate flex-1 mr-2">{a.title}</span>
                            <span className={`text-[10px] font-bold ${scoreColor(a.resilience)}`}>{a.resilience}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{a.status} · {a.date}</span>
                        </button>
                      ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Add a note (optional)</Label>
                  <Input placeholder="e.g. This Gold version worked really well..." value={shareNote} onChange={e => setShareNote(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowShareModal(false)}>Cancel</Button>
                  <Button className="flex-1 gap-2" onClick={handleShare} disabled={!shareTarget || loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Share
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (view === 'create') return (
    <div className="max-w-md mx-auto p-10 space-y-6">
      <button onClick={() => setView('list')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-3 h-3" />Back</button>
      <h2 className="text-2xl font-bold font-serif italic">Create a department</h2>
      <div className="space-y-4">
        <div className="space-y-2"><Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Department name</Label><Input placeholder="e.g. English Department" value={deptName} onChange={e => setDeptName(e.target.value)} autoFocus /></div>
        <div className="space-y-2"><Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">School name (optional)</Label><Input placeholder="e.g. Lincoln High School" value={schoolName} onChange={e => setSchoolName(e.target.value)} /></div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setView('list')}>Cancel</Button>
        <Button className="flex-1 gap-2" onClick={handleCreate} disabled={!deptName.trim() || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create
        </Button>
      </div>
    </div>
  );

  if (view === 'join') return (
    <div className="max-w-md mx-auto p-10 space-y-6">
      <button onClick={() => setView('list')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-3 h-3" />Back</button>
      <h2 className="text-2xl font-bold font-serif italic">Join a department</h2>
      <p className="text-sm text-muted-foreground">Ask your Head of Department for the 6-character invite code.</p>
      <Input placeholder="e.g. ABC123" value={inviteCode} maxLength={6} onChange={e => setInviteCode(e.target.value.toUpperCase())} className="text-center text-xl tracking-widest font-bold uppercase" autoFocus />
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setView('list')}>Cancel</Button>
        <Button className="flex-1 gap-2" onClick={handleJoin} disabled={inviteCode.length < 6 || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}Join
        </Button>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3"><Users className="w-6 h-6 text-accent" /><h1 className="text-3xl font-bold font-serif italic">Departments</h1></div>
          <p className="text-muted-foreground text-sm mt-1">Share assignments and collaborate with your department.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => setView('join')}><UserPlus className="w-3.5 h-3.5" />Join</Button>
          <Button size="sm" className="gap-2 text-xs" onClick={() => setView('create')}><Plus className="w-3.5 h-3.5" />Create</Button>
          <Button variant="outline" onClick={onBack}>Back to Studio</Button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center"><Users className="w-8 h-8 text-muted-foreground" /></div>
          <div className="space-y-2"><p className="font-bold text-lg">No departments yet</p><p className="text-sm text-muted-foreground max-w-sm">Create a department to share assignments with colleagues, or join one with an invite code.</p></div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setView('join')}><UserPlus className="w-4 h-4" />Join with code</Button>
            <Button className="gap-2" onClick={() => setView('create')}><Plus className="w-4 h-4" />Create department</Button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {departments.map((dept, i) => (
            <motion.div key={dept.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-6 border border-border hover:border-accent/30 hover:shadow-md transition-all cursor-pointer group" onClick={() => handleOpenDept(dept)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Users className="w-5 h-5 text-accent" /></div>
                </div>
                <h3 className="font-bold text-base group-hover:text-accent transition-colors">{dept.name}</h3>
                {dept.school_name && <p className="text-xs text-muted-foreground mt-0.5">{dept.school_name}</p>}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">Click to view</span>
                  <span className="text-xs text-accent font-medium">Open →</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
