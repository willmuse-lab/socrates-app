import React from 'react';
import { motion } from 'motion/react';
import { Shield, BookOpen, Users, Award, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps { onBack: () => void; }

export function AboutPage({ onBack }: PageProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6 md:p-10 space-y-12">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Studio</button>
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold font-serif italic leading-tight">Built by educators,<br />for educators.</h1>
          <p className="text-muted-foreground leading-relaxed">Socrates was created out of a simple frustration: AI tools were making it easier for students to avoid the hard work of learning. Rather than banning AI — which is both impossible and counterproductive — we set out to help teachers design assignments where AI <em>cannot replace</em> genuine student thinking.</p>
          <p className="text-muted-foreground leading-relaxed">The Triple-A Framework emerged from two years of classroom research, consultation with pedagogical experts, and analysis of UNESCO's AI in education guidelines.</p>
        </div>
        <div className="bg-secondary/50 rounded-2xl border border-border p-8 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Our philosophy</p>
          <blockquote className="text-2xl font-serif italic text-accent leading-relaxed">"The unexamined assignment is not worth giving."</blockquote>
          <p className="text-sm text-muted-foreground">— The Socratic Architect</p>
        </div>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold font-serif italic">The research behind Socrates</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: BookOpen, title: 'UNESCO AI Competency Framework (2023)', desc: "Our five core dimensions map directly to UNESCO's guidelines for AI literacy in education." },
            { icon: Award, title: 'Bearman & Luckin (2024)', desc: '"AI-proof" assignments are a myth. We design for "AI-evident" tasks where AI use is traceable.' },
            { icon: Users, title: 'Mollick & Mollick (2023)', desc: 'Personal stakes are the single most effective AI-resilience strategy.' },
            { icon: Shield, title: 'Lodge et al. (2023)', desc: 'Students who reflect on their own AI use perform significantly better on subsequent unaided tasks.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 border border-border rounded-xl bg-card space-y-2 hover:border-accent/30 transition-colors">
              <Icon className="w-5 h-5 text-accent" />
              <p className="text-sm font-bold">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-8 text-center space-y-4">
        <Mail className="w-8 h-8 text-accent mx-auto" />
        <h3 className="text-xl font-bold font-serif italic">Get in touch</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">Questions about the framework, partnership opportunities, research collaboration, or school pricing.</p>
        <Button onClick={() => window.location.href = 'mailto:hello@socratesmuse.com'} className="gap-2">
          <Mail className="w-4 h-4" />hello@socratesmuse.com
        </Button>
      </div>
    </motion.div>
  );
}

export function PrivacyPage({ onBack }: PageProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Studio</button>
      <div className="space-y-2">
        <div className="flex items-center gap-3"><Shield className="w-6 h-6 text-accent" /><h1 className="text-3xl font-bold font-serif italic">Data Privacy & Security</h1></div>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>
      {[
        { title: 'What data we collect', content: 'We collect the minimum necessary: your name and email address, assignment text you submit for analysis, your saved assignments and analysis results, and basic usage metadata.\n\nWe do NOT collect student names, student work, grades, or any personally identifiable student information.' },
        { title: 'How assignment text is processed', content: "When you submit an assignment for analysis, the text is sent to Anthropic's Claude API. This is the AI that powers Socrates.\n\nAnthropic's API processes your text to generate the analysis and then the text is discarded — it is not stored by Anthropic for training purposes under our API agreement. Your assignment text is never sold or shared with third parties." },
        { title: 'FERPA compliance', content: 'Socrates is designed for teacher use, not student use. Teachers should not submit student-identifying information as part of assignment text.\n\nDistrict plan subscribers receive a Data Processing Agreement (DPA) that satisfies FERPA requirements. Contact us at hello@socratesmuse.com to request a DPA.' },
        { title: 'Google Drive & Docs', content: 'When you connect Google Drive, we request the minimum permissions needed: read access to your Google Docs and write access to create new Google Docs for export.\n\nWe do not access any other files in your Drive. Your Google OAuth token is stored in a secure, HttpOnly cookie and is never logged or stored in our database.' },
        { title: 'Data retention & deletion', content: 'You can delete your saved assignments at any time from the Library.\n\nTo delete your account and all associated data, email hello@socratesmuse.com. We will process deletion requests within 14 days.' },
        { title: 'Contact', content: 'Data privacy questions: hello@socratesmuse.com\nWe aim to respond within 2 business days.' },
      ].map(({ title, content }) => (
        <div key={title} className="space-y-3 pb-6 border-b border-border last:border-0">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</div>
        </div>
      ))}
    </motion.div>
  );
}
