import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { AnalysisResult } from './gemini';
import { LessonPlan, StudentDirections, LessonPlanSection } from './standards';
import { createGoogleDoc } from './google';

export async function exportToPDF(result: AnalysisResult, originalText: string) {
  const doc = new jsPDF();
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);

  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229);
  doc.text('SocratesIQ Analysis Report', margin, y);
  y += 15;

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`Resilience Score: ${result.resilienceScore}/100`, margin, y);
  y += 10;

  doc.setFontSize(12);
  const summaryLines = doc.splitTextToSize(result.summary, contentWidth);
  doc.text(summaryLines, margin, y);
  y += (summaryLines.length * 7) + 10;

  doc.setFontSize(16);
  doc.text('Analysis Dimensions', margin, y);
  y += 10;
  doc.setFontSize(11);
  result.dimensions.forEach(dim => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text(`${dim.name}: ${dim.score}%`, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(dim.explanation, contentWidth);
    doc.text(lines, margin, y);
    y += (lines.length * 5) + 8;
  });

  doc.addPage();
  y = 20;
  doc.setFontSize(16);
  doc.text('Redesign Suggestions', margin, y);
  y += 15;

  result.suggestions.forEach(suggestion => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text(`${suggestion.level}: ${suggestion.title}`, margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    const descLines = doc.splitTextToSize(suggestion.description, contentWidth);
    doc.text(descLines, margin, y);
    y += (descLines.length * 5) + 10;
    doc.setTextColor(0, 0, 0);
    const assignmentLines = doc.splitTextToSize(suggestion.modifiedAssignment, contentWidth);
    if (y + (assignmentLines.length * 5) > 280) { doc.addPage(); y = 20; }
    doc.text(assignmentLines, margin, y);
    y += (assignmentLines.length * 5) + 20;
  });

  doc.save('socrates-analysis.pdf');
}

export async function exportToDocx(result: AnalysisResult, originalText: string) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: "SocratesIQ Analysis Report", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: `Resilience Score: ${result.resilienceScore}/100`, bold: true, size: 28 })], spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: result.summary, spacing: { after: 400 } }),
        new Paragraph({ text: "Analysis Dimensions", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        ...result.dimensions.flatMap(dim => [
          new Paragraph({ children: [new TextRun({ text: `${dim.name}: `, bold: true }), new TextRun({ text: `${dim.score}%` })] }),
          new Paragraph({ text: dim.explanation, spacing: { after: 200 } }),
        ]),
        new Paragraph({ text: "Redesign Suggestions", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        ...result.suggestions.flatMap(suggestion => [
          new Paragraph({ children: [new TextRun({ text: `${suggestion.level}: ${suggestion.title}`, bold: true, color: "4F46E5" })], spacing: { before: 300 } }),
          new Paragraph({ children: [new TextRun({ text: suggestion.description, italics: true })], spacing: { after: 200 } }),
          new Paragraph({ text: suggestion.modifiedAssignment, spacing: { after: 400 } }),
        ]),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "socrates-analysis.docx");
}

// ============================================================================
// Generic simple-document exporters — used for redesigned assignments, lesson
// plans, and student directions. A document is a title plus a list of blocks;
// each block is an optional bold heading followed by optional body text.
// ============================================================================
export interface DocBlock { heading?: string; text?: string; }

function slugify(title: string): string {
  return (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50) || 'socratesiq-document');
}

export function downloadSimplePDF(title: string, blocks: DocBlock[]) {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  let y = 20;
  const ensureRoom = (needed: number) => { if (y + needed > 280) { doc.addPage(); y = 20; } };

  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 8;
  doc.setTextColor(0, 0, 0);

  blocks.forEach(block => {
    if (block.heading) {
      ensureRoom(12);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const hLines = doc.splitTextToSize(block.heading, contentWidth);
      doc.text(hLines, margin, y);
      y += hLines.length * 6 + 3;
      doc.setFont('helvetica', 'normal');
    }
    if (block.text) {
      doc.setFontSize(11);
      // Print paragraph by paragraph so page breaks land between lines.
      block.text.split('\n').forEach(par => {
        const lines = par.trim() ? doc.splitTextToSize(par, contentWidth) : [' '];
        lines.forEach((line: string) => { ensureRoom(6); doc.text(line, margin, y); y += 5; });
      });
      y += 6;
    }
  });

  doc.save(`${slugify(title)}.pdf`);
}

export async function downloadSimpleDocx(title: string, blocks: DocBlock[]) {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
  ];
  blocks.forEach(block => {
    if (block.heading) children.push(new Paragraph({ children: [new TextRun({ text: block.heading, bold: true })], spacing: { before: 300, after: 100 } }));
    if (block.text) block.text.split('\n').forEach(par => children.push(new Paragraph({ text: par, spacing: { after: 100 } })));
  });
  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slugify(title)}.docx`);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const para = (s: string) => s.split('\n').map(p => `<p>${esc(p) || '&nbsp;'}</p>`).join('');

export function simpleDocToHTML(title: string, blocks: DocBlock[]): string {
  let html = `<h1>${esc(title)}</h1>`;
  blocks.forEach(block => {
    if (block.heading) html += `<h2>${esc(block.heading)}</h2>`;
    if (block.text) html += para(block.text);
  });
  return `<html><body>${html}</body></html>`;
}

/** Create a Google Doc from a simple document; returns the Doc's URL. */
export async function exportSimpleDocToGoogle(title: string, blocks: DocBlock[]): Promise<string> {
  const { url } = await createGoogleDoc(title, simpleDocToHTML(title, blocks));
  return url;
}

// ---------------------------------------------------------------------------
// Block builders for each exportable thing
// ---------------------------------------------------------------------------
export function redesignToBlocks(assignmentText: string): DocBlock[] {
  return [{ text: assignmentText }];
}

export function lessonPlanToBlocks(plan: LessonPlan): DocBlock[] {
  const s = (sec: LessonPlanSection, num: string): DocBlock => ({ heading: `Section ${num}: ${sec.title}`, text: sec.content });
  return [
    { text: `Teacher: ________    Date: ________    Grade/Subject: ________\nAI Framework: ${plan.aiFramework || 'TeachAI Toolkit'}` },
    s(plan.sectionI, 'I'), s(plan.sectionII, 'II'), s(plan.sectionIII, 'III'),
    s(plan.sectionIV, 'IV'), s(plan.sectionV, 'V'), s(plan.sectionVI, 'VI'),
    { heading: 'Teacher Reflection', text: plan.teacherReflection },
  ];
}

export function directionsToBlocks(d: StudentDirections): DocBlock[] {
  return [
    { heading: 'Steps', text: d.steps },
    { heading: 'Using AI on This Assignment', text: d.aiRules },
    { heading: "How You'll Be Graded", text: d.grading },
  ];
}

// ---------------------------------------------------------------------------
// Full analysis report → Google Doc (client-side; replaces the old backend
// call). Same shape the PDF/DOCX reports use.
// ---------------------------------------------------------------------------
export async function exportToGoogleDocs(result: AnalysisResult, originalText: string, docTitle: string): Promise<{ docUrl: string } | null> {
  const blocks: DocBlock[] = [
    { text: `Resilience Score: ${result.resilienceScore}/100\n\n${result.summary}` },
    { heading: 'Analysis Dimensions' },
    ...result.dimensions.map(dim => ({ heading: `${dim.name}: ${dim.score}%`, text: dim.explanation })),
    { heading: 'Redesign Suggestions' },
    ...result.suggestions.flatMap(sug => [
      { heading: `${sug.level}: ${sug.title}`, text: sug.description },
      { text: sug.modifiedAssignment },
    ]),
  ];
  const { url } = await createGoogleDoc(docTitle, simpleDocToHTML(docTitle, blocks));
  return { docUrl: url };
}
