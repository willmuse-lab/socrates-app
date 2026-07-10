import React from 'react';
import { motion } from 'motion/react';
import { Shield, BookOpen, Mail, Gauge, Quote, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TEACHER_COMMENTS } from '@/src/lib/comments';

interface PageProps { onBack: () => void; }

export function AboutPage({ onBack }: PageProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6 md:p-10 space-y-12">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Studio</button>
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold font-serif italic leading-tight">Built by educators,<br />for educators.</h1>
          <p className="text-muted-foreground leading-relaxed">SocratesIQ was created out of a simple frustration: AI tools were making it easier for students to avoid the hard work of learning. Rather than banning AI — which is both impossible and counterproductive — we set out to help teachers design assignments where AI <em>cannot replace</em> genuine student thinking.</p>
          <p className="text-muted-foreground leading-relaxed">Our methodology emerged from classroom research, consultation with pedagogical experts, and analysis of international AI-in-education guidance.</p>
        </div>
        <div className="bg-secondary/50 rounded-2xl border border-border p-8 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Our philosophy</p>
          <blockquote className="text-2xl font-serif italic text-accent leading-relaxed">"The unexamined assignment is not worth giving."</blockquote>
          <p className="text-sm text-muted-foreground">— The Socratic Architect</p>
        </div>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold font-serif italic">The research behind SocratesIQ</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">Every analysis is grounded in peer-reviewed research and international guidance on AI and assessment, including work from these sources:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'UNESCO (2023)', 'Bearman & Luckin (2024)', 'Mollick & Mollick (2023)', 'Lodge et al. (2023)',
            'Dawson (2021)', 'TEQSA (2024)', 'Eaton (2023)', 'Perkins, Furze, Roe & MacVaugh (2024)',
            'Awadallah Alkouk & Khlaif (2024)', 'Sperber et al. (2025)',
          ].map(name => (
            <span key={name} className="px-3 py-1.5 rounded-full bg-secondary/60 border border-border text-xs font-medium text-foreground/80">{name}</span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic">How these sources are combined into SocratesIQ's scoring rubric and redesign engine is part of our proprietary methodology.</p>
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

export function ScoringPage({ onBack }: PageProps) {
  const bands = [
    { range: '0–30', label: 'Highly vulnerable', desc: 'A student could complete it with a single AI prompt.', color: 'text-red-500' },
    { range: '31–50', label: 'Vulnerable', desc: 'Some friction, but still largely AI-completable.', color: 'text-orange-500' },
    { range: '51–70', label: 'Moderate', desc: 'Has one or two resilient elements, but gaps remain.', color: 'text-amber-500' },
    { range: '71–85', label: 'Strong', desc: 'Multiple anchors, a process requirement, a personal element.', color: 'text-lime-600' },
    { range: '86–100', label: 'Exceptional', desc: 'AI can assist, but cannot replace the student.', color: 'text-green-600' },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-6 md:p-10 space-y-10">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Studio</button>
      <div className="space-y-3">
        <div className="flex items-center gap-3"><Gauge className="w-6 h-6 text-accent" /><h1 className="text-3xl font-bold font-serif italic">How scoring works</h1></div>
        <p className="text-muted-foreground leading-relaxed">Every assignment gets a <strong>resilience score from 0 to 100</strong>. Higher means more resilient — harder for a student to complete with AI doing the thinking. "Vulnerability" is simply the flip side: a low resilience score means high vulnerability.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">What produces the score</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">There is no fixed formula crunching numbers. SocratesIQ sends your assignment to its AI together with a research-based rubric and asks a single expert question: <em>how hard would it be for a student to complete this with AI doing the work?</em> The AI weighs the assignment against the rubric below and returns a score, a breakdown of how it could be shortcut, and ready-to-use redesigns that raise it.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">The four dimensions it looks for</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">The score is built from four research-based dimensions, each scored individually with an explanation in your results. (If you switch to the Bloom's framework in Settings, it scores against cognitive levels instead.)</p>
        <div className="flex flex-wrap gap-2">
          {['Anchor', 'Proprietary', 'Audit', 'Agency'].map(name => (
            <span key={name} className="px-4 py-2 rounded-full bg-secondary/60 border border-border text-sm font-bold text-foreground/80">{name}</span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic">The detailed rubric behind each dimension is part of SocratesIQ's proprietary methodology — your analysis results explain how each one applies to your specific assignment.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">The score bands</h2>
        <div className="space-y-2">
          {bands.map(({ range, label, desc, color }) => (
            <div key={range} className="flex items-start gap-4 p-4 border border-border rounded-xl bg-card">
              <span className={`text-sm font-bold w-16 shrink-0 ${color}`}>{range}</span>
              <div>
                <p className="text-sm font-bold">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 space-y-2">
        <h2 className="text-base font-bold">A note on what the score is — and isn't</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">Because the score is an expert AI judgment against a rubric rather than a fixed calculation, it is consistent in the ballpark but the exact number can shift a few points run to run. Treat it as a <strong>diagnostic guide, not a final grade</strong>. The real value is the breakdown of how an assignment could be shortcut — and the Bronze, Silver, and Gold redesigns that show you how to strengthen it.</p>
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
        { title: 'How assignment text is processed', content: "When you submit an assignment for analysis, the text is sent to Anthropic's Claude API. This is the AI that powers SocratesIQ.\n\nAnthropic's API processes your text to generate the analysis and then the text is discarded — it is not stored by Anthropic for training purposes under our API agreement. Your assignment text is never sold or shared with third parties." },
        { title: 'FERPA compliance', content: 'SocratesIQ is designed for teacher use, not student use. Teachers should not submit student-identifying information as part of assignment text.\n\nDistrict plan subscribers receive a Data Processing Agreement (DPA) that satisfies FERPA requirements. Contact us at hello@socratesmuse.com to request a DPA.' },
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

export function FeedbackPage({ onBack }: PageProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6 md:p-10 space-y-10">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Studio</button>
      <div className="text-center space-y-3">
        <div className="flex justify-center gap-1">
          {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
        </div>
        <h1 className="text-4xl font-bold font-serif italic">Teacher feedback</h1>
        <p className="text-muted-foreground">What teachers are telling us after using SocratesIQ in their classrooms.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {TEACHER_COMMENTS.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-2xl p-6 space-y-3 hover:border-accent/30 transition-colors">
            <Quote className="w-5 h-5 text-accent opacity-40" />
            <p className="text-sm font-serif italic leading-relaxed text-foreground">"{c.quote}"</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">— {c.role}</p>
          </motion.div>
        ))}
      </div>
      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-8 text-center space-y-3">
        <h3 className="text-xl font-bold font-serif italic">Using SocratesIQ in your classroom?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">We'd love to hear what's working. Send us your experience and it may appear here.</p>
        <Button onClick={() => window.location.href = 'mailto:hello@socratesmuse.com?subject=My%20Socrates%20feedback'} className="gap-2">
          <Mail className="w-4 h-4" />Share your feedback
        </Button>
      </div>
    </motion.div>
  );
}

export function TermsPage({ onBack }: PageProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Studio</button>
      <div className="space-y-2">
        <div className="flex items-center gap-3"><BookOpen className="w-6 h-6 text-accent" /><h1 className="text-3xl font-bold font-serif italic">Terms of Service</h1></div>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>
      {[
        { title: '1. Agreement to these terms', content: 'These Terms of Service ("Terms") govern your access to and use of SocratesIQ ("the Service"), operated by SocratesIQ ("we," "us"). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.' },
        { title: '2. What SocratesIQ does', content: 'SocratesIQ helps educators analyze and redesign their own teaching assignments to be more resilient to AI completion. The Service uses artificial intelligence to generate scores, suggestions, and redesigned assignment text. These outputs are educational guidance, not professional, legal, or accreditation advice.' },
        { title: '3. Eligibility and accounts', content: 'The Service is intended for educators and school staff aged 18 or older. You are responsible for the accuracy of your account information and for keeping your login credentials secure. You are responsible for all activity that occurs under your account.' },
        { title: '4. Acceptable use', content: 'You agree to use SocratesIQ only for lawful, educational purposes. You agree NOT to: submit content you do not have the right to submit; attempt to disrupt, reverse engineer, or gain unauthorized access to the Service; resell or redistribute the Service without our written permission; or use the Service to violate any applicable law or any third party’s rights.' },
        { title: '5. Student data and your responsibility', content: 'SocratesIQ is designed for teachers to analyze their own assignment prompts. You agree NOT to submit student names, student work, grades, or other personally identifiable student information. You are responsible for complying with your institution’s policies and applicable laws (including FERPA) when using the Service. See our Privacy page for how submitted text is handled.' },
        { title: '6. AI-generated content', content: 'Scores and suggestions are produced by AI and are provided "as is." They are estimates intended to guide your professional judgment, not guarantees. The resilience score is a diagnostic indicator, not a certification that an assignment cannot be completed with AI. You are responsible for reviewing and adapting any generated material before classroom use.' },
        { title: '7. Subscriptions and billing', content: 'Some features require a paid subscription. Pricing and any free allowance are described on our Pricing page. Where paid plans are offered, fees are billed in advance and are non-refundable except where required by law. You may cancel at any time; cancellation stops future charges and takes effect at the end of the current billing period. We may change pricing with reasonable notice.' },
        { title: '8. Intellectual property', content: 'The Service, including its software, design, and content we provide, is owned by us and protected by law. Assignment text you submit remains yours. Redesigned assignments and suggestions generated for you are yours to use in your teaching. You grant us a limited license to process your submitted text solely to provide the Service.' },
        { title: '9. Disclaimers', content: 'The Service is provided "as is" and "as available," without warranties of any kind, express or implied, including fitness for a particular purpose. We do not warrant that the Service will be uninterrupted, error-free, or that any suggestion will achieve a particular educational outcome.' },
        { title: '10. Limitation of liability', content: 'To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability for any claim relating to the Service will not exceed the amount you paid us in the 12 months before the claim.' },
        { title: '11. Termination', content: 'You may stop using the Service at any time. We may suspend or terminate access if you violate these Terms or use the Service in a way that could harm us or other users. Upon termination, your right to use the Service ends; sections that by their nature should survive (such as intellectual property, disclaimers, and limitation of liability) will continue to apply.' },
        { title: '12. Changes to these terms', content: 'We may update these Terms from time to time. When we make material changes, we will update the date above and, where appropriate, notify you. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.' },
        { title: '13. Contact', content: 'Questions about these Terms: hello@socratesmuse.com' },
      ].map(({ title, content }) => (
        <div key={title} className="space-y-3 pb-6 border-b border-border last:border-0">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</div>
        </div>
      ))}
    </motion.div>
  );
}
