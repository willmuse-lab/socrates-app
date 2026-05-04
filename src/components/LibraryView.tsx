import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Library, ArrowRight, Clock, ShieldCheck, Trash2, Search, SlidersHorizontal, ArrowUpDown, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedAssignment } from '../App';

interface LibraryViewProps {
  onBack: () => void;
  assignments: SavedAssignment[];
  onOpen: (assignment: SavedAssignment) => void;
  onDelete: (id: string) => void;
}

type SortKey = 'date' | 'resilience' | 'title';
type FilterStatus = 'All' | 'Bronze' | 'Silver' | 'Gold';

const STATUS_COLORS: Record<string, string> = {
  Gold: 'bg-amber-100 text-amber-700 border-amber-200',
  Silver: 'bg-slate-100 text-slate-600 border-slate-200',
  Bronze: 'bg-orange-100 text-orange-700 border-orange-200',
};

const SCORE_COLOR = (score: number) => score >= 70 ? 'text-[#708D81]' : score >= 40 ? 'text-[#D4A373]' : 'text-red-400';

export function LibraryView({ onBack, assignments, onOpen, onDelete }: LibraryViewProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('All');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...assignments];
    if (filter !== 'All') list = list.filter(a => a.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.fullText?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortKey === 'resilience') return b.resilience - a.resilience;
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
    return list;
  }, [assignments, query, filter, sortKey]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete === id) { onDelete(id); setConfirmDelete(null); }
    else { setConfirmDelete(id); setTimeout(() => setConfirmDelete(null), 3000); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-6xl mx-auto w-full p-6 md:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Library className="w-6 h-6 text-accent" />
            <h1 className="text-3xl font-bold font-serif italic">Architecture Library</h1>
          </div>
          <p className="text-muted-foreground">{assignments.length} saved assignment{assignments.length !== 1 ? 's' : ''} — persisted locally in your browser.</p>
        </div>
        <Button variant="outline" onClick={onBack}>Back to Studio</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search assignments..." className="pl-10 h-10 border-border focus-visible:ring-accent" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          {(['All', 'Bronze', 'Silver', 'Gold'] as FilterStatus[]).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all ${filter === s ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          {(['date', 'resilience', 'title'] as SortKey[]).map(s => (
            <button key={s} onClick={() => setSortKey(s)}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all ${sortKey === s ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{s}</button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center"><BookOpen className="w-7 h-7 text-muted-foreground" /></div>
          <div className="space-y-1">
            <p className="font-bold text-lg">{query || filter !== 'All' ? 'No matches found' : 'Your library is empty'}</p>
            <p className="text-sm text-muted-foreground">{query || filter !== 'All' ? 'Try a different search or filter.' : 'Analyze an assignment and save it to see it here.'}</p>
          </div>
          {(query || filter !== 'All') && <Button variant="outline" size="sm" onClick={() => { setQuery(''); setFilter('All'); }}>Clear filters</Button>}
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, idx) => (
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ delay: idx * 0.04 }}>
                <Card className="p-6 border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all group flex flex-col relative overflow-hidden cursor-pointer" onClick={() => onOpen(item)}>
                  <div className="flex justify-between items-start mb-4">
                    <Badge className={`rounded-full px-3 py-0.5 text-[10px] uppercase font-bold tracking-widest border ${STATUS_COLORS[item.status]}`}>
                      {item.status === 'Gold' ? '🥇' : item.status === 'Silver' ? '🥈' : '🥉'} {item.status}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-xs font-bold ${SCORE_COLOR(item.resilience)}`}><ShieldCheck className="w-3.5 h-3.5" />{item.resilience}</span>
                      <button onClick={(e) => handleDelete(item.id, e)}
                        className={`p-1 rounded transition-all ${confirmDelete === item.id ? 'opacity-100 text-destructive bg-destructive/10' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive'}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-base font-bold mb-6 group-hover:text-accent transition-colors leading-snug line-clamp-2">{item.title}</h3>
                  {item.fullText && <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-4">{item.fullText.substring(0, 120)}…</p>}
                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" />{item.date}</div>
                    <Button variant="ghost" size="sm" className="h-8 group-hover:translate-x-1 transition-transform text-xs">Open <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Button>
                  </div>
                  <AnimatePresence>
                    {confirmDelete === item.id && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute bottom-0 left-0 right-0 bg-destructive/10 border-t border-destructive/20 px-4 py-2 text-[10px] text-destructive font-bold text-center uppercase tracking-wider">
                        Click delete again to confirm
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
