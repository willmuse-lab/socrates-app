import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, FileText, TrendingUp, ShieldCheck, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { supabaseEnabled } from '@/src/lib/supabase';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'socrates2025';

interface AdminDashboardProps { onBack: () => void; }

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) { setAuthed(true); }
    else { setPwError('Incorrect password.'); setPw(''); }
  };

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    setTimeout(() => {
      setStats({
        totalTeachers: 47, totalAnalyses: 312, avgScore: 61, topSubject: 'English / Language Arts',
        recentActivity: [
          { name: 'Mrs. Davis', action: 'Analyzed "The Great Gatsby Essay"', time: '2 min ago' },
          { name: 'Mr. Muse', action: 'Saved Gold redesign to library', time: '14 min ago' },
          { name: 'Dr. Patel', action: 'Uploaded research: Mollick 2024', time: '1 hr ago' },
          { name: 'Ms. Johnson', action: 'Applied Silver version', time: '2 hrs ago' },
          { name: 'Mr. Williams', action: 'Exported analysis to Google Docs', time: '3 hrs ago' },
        ],
        scoreDistribution: [
          { range: '0–30 (Low)', count: 42, color: 'bg-red-400' },
          { range: '31–50 (Fair)', count: 89, color: 'bg-orange-400' },
          { range: '51–70 (Moderate)', count: 118, color: 'bg-yellow-400' },
          { range: '71–85 (Strong)', count: 47, color: 'bg-green-500' },
          { range: '86–100 (Exceptional)', count: 16, color: 'bg-accent' },
        ],
      });
      setLoading(false);
    }, 800);
  }, [authed]);

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto"><ShieldCheck className="w-6 h-6 text-accent" /></div>
          <h2 className="text-xl font-bold font-serif italic">Admin Dashboard</h2>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" placeholder="Admin password" value={pw}
            onChange={e => { setPw(e.target.value); setPwError(''); }}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent" autoFocus />
          {pwError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{pwError}</p>}
          <Button type="submit" className="w-full">Enter</Button>
        </form>
        <button onClick={onBack} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">← Back to Studio</button>
      </Card>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-accent" />
            <h1 className="text-3xl font-bold font-serif italic">Admin Dashboard</h1>
            {!supabaseEnabled && <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Demo data</Badge>}
          </div>
          <p className="text-muted-foreground text-sm mt-1">School-wide usage and engagement overview.</p>
        </div>
        <Button variant="outline" onClick={onBack}>← Back</Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Teachers', value: stats.totalTeachers, color: 'text-accent', bg: 'bg-accent/10' },
              { icon: FileText, label: 'Analyses run', value: stats.totalAnalyses, color: 'text-purple-600', bg: 'bg-purple-50' },
              { icon: ShieldCheck, label: 'Avg score', value: `${stats.avgScore}%`, color: 'text-green-600', bg: 'bg-green-50' },
              { icon: BookOpen, label: 'Top subject', value: stats.topSubject.split('/')[0].trim(), color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <Card key={label} className="p-5 border border-border space-y-3">
                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div>
                <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p></div>
              </Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border border-border space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Score Distribution</h3>
              <div className="space-y-3">
                {stats.scoreDistribution.map(({ range, count, color }: any) => {
                  const max = Math.max(...stats.scoreDistribution.map((d: any) => d.count));
                  return (
                    <div key={range} className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{range}</span><span className="font-bold">{count}</span></div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${color}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="p-6 border border-border space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Recent Activity</h3>
              <div className="space-y-3">
                {stats.recentActivity.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent flex-shrink-0">
                      {item.name.split(' ')[1]?.[0] || item.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.action}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          {!supabaseEnabled && (
            <Card className="p-6 border border-amber-200 bg-amber-50 flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-800">Connect Supabase to see live data</p>
                <p className="text-xs text-amber-700 leading-relaxed mt-1">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Netlify environment variables.</p>
              </div>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
