import React, { useState, useEffect, useCallback } from 'react';
import { AssignmentAnalyzer } from './components/AssignmentAnalyzer';
import { LibraryView } from './components/LibraryView';
import { AdminResearch } from './components/AdminResearch';
import { DepartmentView } from './components/DepartmentView';
import { AdminDashboard } from './components/AdminDashboard';
import { Onboarding } from './components/Onboarding';
import { Pricing } from './components/Pricing';
import { AboutPage, PrivacyPage } from './components/StaticPages';
import { Testimonials } from './components/Testimonials';
import { SplashScreen } from './components/SplashScreen';
import { UserMenu } from './components/UserMenu';
import { LoginDialog } from './components/LoginDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { FrameworkDimension, DEFAULT_DIMENSIONS, BloomsLevel, BLOOMS_LEVELS } from '@/src/lib/gemini';
import { loadAssignments, saveAssignments, loadSettings, saveSettings, loadUser, saveUser, clearUser, AppSettings } from '@/src/lib/storage';
import { supabaseEnabled, onAuthStateChange, fetchAssignmentsFromCloud, saveAssignmentToCloud, deleteAssignmentFromCloud, signOut } from '@/src/lib/supabase';
import { loadProfile, saveProfile, clearProfile, TeacherProfile } from '@/src/lib/profile';
import { Settings, ShieldCheck, Zap, Plus, Trash2, Cloud, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

type ViewMode = 'studio' | 'library' | 'admin-research' | 'admin-dashboard' | 'pricing' | 'about' | 'privacy' | 'departments';
type AIPreference = 'avoid' | 'augment' | 'embrace';

export interface SavedAssignment {
  id: string; title: string; fullText: string;
  status: 'Bronze' | 'Silver' | 'Gold'; resilience: number; date: string;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; id?: string } | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('studio');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openedAssignment, setOpenedAssignment] = useState<SavedAssignment | null>(null);
  const [activeFramework, setActiveFramework] = useState<'triple-a' | 'blooms'>('triple-a');
  const [defaultPreference, setDefaultPreference] = useState<AIPreference>('avoid');
  const [bloomsLevel, setBloomsLevel] = useState<BloomsLevel>('Analyze');
  const [dimensions, setDimensions] = useState<FrameworkDimension[]>(DEFAULT_DIMENSIONS);
  const [savedAssignments, setSavedAssignments] = useState<SavedAssignment[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  useEffect(() => {
    const storedUser = loadUser();
    if (storedUser) setUser(storedUser);
    const storedProfile = loadProfile();
    if (storedProfile) setProfile(storedProfile);
    const settings = loadSettings();
    setActiveFramework(settings.activeFramework);
    setDefaultPreference(settings.defaultPreference);
    setBloomsLevel(settings.bloomsLevel);
    setDimensions(settings.dimensions);
    setSavedAssignments(loadAssignments());
    setHydrated(true);
    const hasShownSplash = sessionStorage.getItem('hasShownSplash');
    if (hasShownSplash) {
      setShowSplash(false);
      if (!storedUser) setIsLoginOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!supabaseEnabled) return;
    let unsub = () => {};
    onAuthStateChange(async (sbUser: any) => {
      if (sbUser) {
        const name = sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Teacher';
        const newUser = { name, email: sbUser.email, id: sbUser.id };
        setUser(newUser); saveUser(newUser); setIsLoginOpen(false);
        const cloud = await fetchAssignmentsFromCloud(sbUser.id);
        if (cloud) { setSavedAssignments(cloud); setCloudSynced(true); }
      }
    }).then(fn => { unsub = fn; });
    return () => unsub();
  }, []);

  useEffect(() => { if (hydrated) saveAssignments(savedAssignments); }, [savedAssignments, hydrated]);
  useEffect(() => {
    if (hydrated) saveSettings({ activeFramework, defaultPreference, bloomsLevel, dimensions });
  }, [activeFramework, defaultPreference, bloomsLevel, dimensions, hydrated]);

  const handleLogin = (name: string, email: string, id?: string) => {
    const newUser = { name, email, id };
    setUser(newUser); saveUser(newUser); setIsLoginOpen(false);
    const existingProfile = loadProfile();
    if (!existingProfile?.onboardingComplete) {
      setShowOnboarding(true);
    } else {
      toast.success(`Welcome back, ${name}!`);
    }
  };

  const handleOnboardingComplete = (p: TeacherProfile) => {
    setProfile(p); saveProfile(p); setShowOnboarding(false);
    toast.success(`You're all set, ${p.name.split(' ')[0]}! Analyses will now be tailored to ${p.subject}.`);
  };

  const handleLogout = async () => {
    if (supabaseEnabled) await signOut();
    setUser(null); clearUser(); clearProfile(); setProfile(null);
    setCloudSynced(false); setSavedAssignments(loadAssignments());
    setIsLoginOpen(true); toast.info('Logged out successfully');
  };

  const handleSaveAssignment = useCallback(async (assignment: Omit<SavedAssignment, 'id' | 'date'>) => {
    const formatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newAssignment: SavedAssignment = {
      ...assignment, id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, date: formatted,
    };
    setSavedAssignments(prev => [newAssignment, ...prev]);
    if (supabaseEnabled && user?.id) {
      await saveAssignmentToCloud(user.id, newAssignment);
      toast.success('Saved and synced to cloud ☁️');
    } else { toast.success('Saved to library!'); }
  }, [user]);

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('hasShownSplash', 'true');
    if (!user) setIsLoginOpen(true);
  };

  const handleSaveSettings = () => {
    saveSettings({ activeFramework, defaultPreference, bloomsLevel, dimensions });
    setIsSettingsOpen(false); toast.success('Settings saved!');
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <AnimatePresence>{showSplash && <SplashScreen onComplete={handleSplashComplete} />}</AnimatePresence>
      <AnimatePresence>{showOnboarding && user && (
        <Onboarding userName={user.name} userEmail={user.email} onComplete={handleOnboardingComplete} />
      )}</AnimatePresence>
      <LoginDialog isOpen={isLoginOpen && !showSplash && !showOnboarding} onLogin={handleLogin} />

      <header className="h-16 md:h-20 px-4 md:px-10 flex items-center justify-between border-b border-border bg-card sticky top-0 z-40">
        <button onClick={() => setViewMode('studio')} className="flex items-center gap-2">
          <img src="/logo.png" alt="Socrates" className="h-10 md:h-[60px] w-auto object-contain" />
        </button>
        <nav className="hidden md:flex items-center gap-6">
          {[
            { label: 'Studio', view: 'studio' },
            { label: 'Library', view: 'library' },
            { label: 'Departments', view: 'departments' },
            { label: 'Pricing', view: 'pricing' },
            { label: 'About', view: 'about' },
          ].map(({ label, view }) => (
            <button key={view} onClick={() => setViewMode(view as ViewMode)}
              className={`text-sm font-medium transition-colors ${viewMode === view ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {profile?.subject && (
            <span className="hidden md:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-secondary text-muted-foreground border border-border">
              {profile.subject.split('/')[0].trim()} · {profile.gradeLevel.split('(')[0].trim()}
            </span>
          )}
          {user && (
            <span title={cloudSynced ? 'Cloud synced' : 'Local only'}
              className={`hidden md:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${cloudSynced ? 'bg-green-50 text-green-600 border-green-200' : 'bg-secondary text-muted-foreground border-border'}`}>
              {cloudSynced ? <Cloud className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}
              {cloudSynced ? 'Cloud' : 'Local'}
            </span>
          )}
          {user ? (
            <UserMenu user={user}
              onLogout={handleLogout}
              onViewLibrary={() => setViewMode('library')}
              onViewSettings={() => setIsSettingsOpen(true)}
              onViewDepartments={() => setViewMode('departments')}
              onViewAdmin={() => setViewMode('admin-research')}
              onViewDashboard={() => setViewMode('admin-dashboard')}
            />
          ) : (
            <div className="animate-pulse flex items-center gap-3">
              <div className="w-20 h-4 bg-secondary rounded" />
              <div className="w-8 h-8 rounded-full bg-secondary" />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {viewMode === 'studio' && (
            <motion.div key="studio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AssignmentAnalyzer
                defaultPreference={defaultPreference} dimensions={dimensions}
                activeFramework={activeFramework} bloomsLevel={bloomsLevel}
                subject={profile?.subject || ''} gradeLevel={profile?.gradeLevel || ''}
                onSave={handleSaveAssignment} onReset={() => setOpenedAssignment(null)}
                initialText={openedAssignment?.fullText || ''}
              />
              <section id="how-to-use" className="py-20 px-6 md:px-10 bg-card border-t border-border">
                <div className="max-w-4xl mx-auto space-y-12">
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold font-serif italic">How to Use Socrates</h2>
                    <p className="text-muted-foreground">Three steps to AI-resilient assignments.</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-8">
                    {[
                      { num: '1', color: 'bg-accent', title: 'Input', desc: 'Paste your assignment or import from Google Drive.' },
                      { num: '2', color: 'bg-green-600', title: 'Analyze', desc: 'Choose your AI strategy and get a resilience score.' },
                      { num: '3', color: 'bg-amber-600', title: 'Refine', desc: 'Apply Bronze, Silver, or Gold redesigns in one click.' },
                    ].map(s => (
                      <div key={s.num} className="space-y-3">
                        <div className={`w-10 h-10 rounded-full ${s.color} text-white flex items-center justify-center font-bold`}>{s.num}</div>
                        <h3 className="font-bold text-lg">{s.title}</h3>
                        <p className="text-sm text-muted-foreground">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <Testimonials />
              <footer className="py-8 px-6 border-t border-border">
                <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Socrates AI · Built for Educators</p>
                  <div className="flex gap-4">
                    {[['Privacy', 'privacy'],['About', 'about'],['Pricing', 'pricing']].map(([l, v]) => (
                      <button key={v} onClick={() => setViewMode(v as ViewMode)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</button>
                    ))}
                  </div>
                </div>
              </footer>
            </motion.div>
          )}
          {viewMode === 'library' && (
            <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
              <LibraryView onBack={() => setViewMode('studio')} assignments={savedAssignments}
                onOpen={a => { setOpenedAssignment(a); setViewMode('studio'); }}
                onDelete={async id => {
                  setSavedAssignments(p => p.filter(a => a.id !== id));
                  if (supabaseEnabled && user?.id) await deleteAssignmentFromCloud(id);
                  toast.info('Removed from library');
                }} />
            </motion.div>
          )}
          {viewMode === 'departments' && (
            <motion.div key="departments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
              <DepartmentView user={user} savedAssignments={savedAssignments}
                onBack={() => setViewMode('studio')}
                onOpenAssignment={a => { setOpenedAssignment(a); setViewMode('studio'); }} />
            </motion.div>
          )}
          {viewMode === 'admin-research' && (
            <motion.div key="admin-research" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
              <AdminResearch onBack={() => setViewMode('studio')} />
            </motion.div>
          )}
          {viewMode === 'admin-dashboard' && (
            <motion.div key="admin-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
              <AdminDashboard onBack={() => setViewMode('studio')} />
            </motion.div>
          )}
          {viewMode === 'pricing' && (
            <motion.div key="pricing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
              <Pricing onBack={() => setViewMode('studio')} />
            </motion.div>
          )}
          {viewMode === 'about' && (
            <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
              <AboutPage onBack={() => setViewMode('studio')} />
            </motion.div>
          )}
          {viewMode === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
              <PrivacyPage onBack={() => setViewMode('studio')} />
            </motion.div>
          )}
        </AnimatePresence>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-[520px] border-border bg-card p-8">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-5 h-5 text-accent" />
                <DialogTitle className="text-2xl font-bold italic font-serif">Studio Settings</DialogTitle>
              </div>
              <DialogDescription>Preferences persist across sessions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-7 py-4">
              {profile && (
                <div className="space-y-3 p-4 bg-secondary/30 rounded-xl border border-border">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Your teaching profile</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{profile.subject}</p>
                      <p className="text-xs text-muted-foreground">{profile.gradeLevel}{profile.schoolName ? ` · ${profile.schoolName}` : ''}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-accent"
                      onClick={() => { setIsSettingsOpen(false); setShowOnboarding(true); }}>
                      Update
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <h4 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Framework</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'triple-a' as const, Icon: ShieldCheck, label: 'Triple-A', desc: 'Anchor, Audit, Agency' },
                    { key: 'blooms' as const, Icon: Zap, label: "Bloom's Revised", desc: 'Cognitive domains' },
                  ].map(({ key, Icon, label, desc }) => (
                    <div key={key} onClick={() => setActiveFramework(key)}
                      className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${activeFramework === key ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'}`}>
                      <Icon className={`w-4 h-4 mb-1.5 ${activeFramework === key ? 'text-accent' : 'text-muted-foreground'}`} />
                      <p className="text-xs font-bold">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              {activeFramework === 'blooms' && (
                <div className="space-y-3">
                  <h4 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Cognitive level</h4>
                  <div className="flex flex-wrap gap-2">
                    {BLOOMS_LEVELS.map(l => (
                      <button key={l} onClick={() => setBloomsLevel(l)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${bloomsLevel === l ? 'bg-secondary border-accent text-accent' : 'bg-secondary/50 border-border text-muted-foreground hover:border-accent/40'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Dimensions</h4>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-bold text-accent gap-1"
                    onClick={() => setDimensions([...dimensions, { name: 'New Dimension', description: 'Describe here.' }])}>
                    <Plus className="w-3 h-3" />Add
                  </Button>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {dimensions.map((dim, i) => (
                    <div key={i} className="p-3 border border-border rounded-lg bg-secondary/20 space-y-1.5 group relative">
                      <button className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => setDimensions(dimensions.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <input className="w-full bg-transparent text-xs font-bold focus:outline-none" value={dim.name}
                        onChange={e => { const d=[...dimensions]; d[i]={...d[i],name:e.target.value}; setDimensions(d); }} />
                      <textarea className="w-full bg-transparent text-[10px] text-muted-foreground focus:outline-none resize-none" rows={2}
                        value={dim.description}
                        onChange={e => { const d=[...dimensions]; d[i]={...d[i],description:e.target.value}; setDimensions(d); }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Default strategy</h4>
                <div className="flex gap-2">
                  {(['avoid','augment','embrace'] as const).map(p => (
                    <button key={p} onClick={() => setDefaultPreference(p)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${defaultPreference === p ? 'bg-secondary border-accent text-accent' : 'bg-secondary/50 border-border text-muted-foreground hover:border-accent/40'}`}>
                      {p === 'avoid' ? 'Avoid AI' : p === 'augment' ? 'Augment' : 'Embrace AI'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings}>Save Settings</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
