import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { AnalysisResult } from './gemini';
import { LessonPlan, StudentDirections } from './standards';
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

// ---------------------------------------------------------------------------
// SCOE CCSS-Aligned Lesson Plan template (the school's official .docx,
// supplied July 12 2026). SCOE_ROWS carries the template's labels and
// parenthetical prompts VERBATIM; the Word export below clones the file's
// layout exactly (header blanks, two-column table ~70/30, reflection section).
// ---------------------------------------------------------------------------
interface ScoeRow { label: string; prompt: string; key: keyof LessonPlan; }

const SCOE_ROWS: ScoeRow[] = [
  { label: 'Learning Standard(s) Addressed:', prompt: '', key: 'standards' },
  { label: 'Learning Target(s):', prompt: '(What will students know & be able to do as a result of this lesson?)', key: 'targets' },
  { label: 'Relevance/Rationale:', prompt: '(Why are the outcomes of this lesson important in the real world? Why are these outcomes essential for future learning?)', key: 'relevance' },
  { label: 'Formative Assessment Criteria for Success:', prompt: "(How will you & your students know if they have successfully met the outcomes? What specific criteria will be met in a successful product/process? What does success on this lesson's outcomes look like?)", key: 'assessment' },
  { label: 'Activities/Tasks:', prompt: '(What learning experiences will students engage in? How will you use these learning experiences or their student products as formative assessment opportunities?)', key: 'activities' },
  { label: 'Resources/Materials:', prompt: '(What texts, digital resources, & materials will be used in this lesson?)', key: 'resources' },
  { label: 'Access for All:', prompt: '(How will you ensure that all students have access to and are able to engage appropriately in this lesson? Consider all aspects of student diversity.)', key: 'accessForAll' },
  { label: 'Modifications/Accommodations:', prompt: '(What curriculum modifications and/or classroom accommodations will you make for Students with Disabilities in your class? Be as specific as possible.)', key: 'modifications' },
];

const SCOE_REFLECTION_INTRO = 'Does this lesson reflect one of the “shifts” in instruction? If so, please describe which shift is addressed and how?';
const SCOE_REFLECTION_CHOICE = 'In addition, please choose ONE question below to respond to after you have taught the lesson OR create your own question and respond to it after you have taught the lesson.';
const SCOE_REFLECTION_QUESTIONS = [
  'How did this lesson support 21st Century Skills?',
  'How did this lesson reflect academic rigor?',
  'How did this lesson cognitively engage students?',
  'How did this lesson engage students in collaborative learning and enhance their collaborative learning skills?',
];

const scoeVal = (plan: LessonPlan, key: keyof LessonPlan) => String(plan[key] ?? '');

/** Linear block form of the SCOE plan — used for the PDF download. */
export function lessonPlanToBlocks(plan: LessonPlan): DocBlock[] {
  const blocks: DocBlock[] = [
    { text: `Subject(s): ${plan.subjects || '________'}    Grade: ${plan.grade || '________'}\nTeacher(s): ${plan.teacher || '________'}    School: ${plan.school || '________'}` },
  ];
  SCOE_ROWS.forEach(row => {
    blocks.push({ heading: row.label, text: scoeVal(plan, row.key) });
  });
  blocks.push({ heading: 'Common Core Aligned Lesson: Reflection', text: `${SCOE_REFLECTION_INTRO}\n${plan.shiftReflection || ''}\n\n${SCOE_REFLECTION_CHOICE}\n${SCOE_REFLECTION_QUESTIONS.map(q => '• ' + q).join('\n')}${plan.reflectionQuestion ? `\n\n${plan.reflectionQuestion}\n${plan.reflectionAnswer || ''}` : ''}` });
  return blocks;
}

/** Word download that clones the school's SCOE template layout exactly. */
export async function exportLessonPlanDocx(plan: LessonPlan) {
  const cellParas = (row: ScoeRow): Paragraph[] => {
    const paras = [new Paragraph({ children: [new TextRun({ text: row.label, bold: true })], spacing: { after: 60 } })];
    if (row.prompt) paras.push(new Paragraph({ children: [new TextRun({ text: row.prompt, italics: true, size: 20 })], spacing: { after: 120 } }));
    scoeVal(plan, row.key).split('\n').forEach(p => paras.push(new Paragraph({ text: p, spacing: { after: 80 } })));
    return paras;
  };
  // Column widths copied from the corrected .docx grid (9582 / 1208 dxa);
  // the narrow "Notes" column stays blank for the teacher's own notes.
  const table = new Table({
    width: { size: 10790, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 9582, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'LESSON ELEMENT', bold: true })] })] }),
          new TableCell({ width: { size: 1208, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Notes', bold: true })] })] }),
        ],
      }),
      ...SCOE_ROWS.map(row => new TableRow({
        children: [
          new TableCell({ width: { size: 9582, type: WidthType.DXA }, children: cellParas(row) }),
          new TableCell({ width: { size: 1208, type: WidthType.DXA }, children: [new Paragraph('')] }),
        ],
      })),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: plan.lessonTitle || 'Lesson Plan', bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun(`Subject(s): ${plan.subjects || '______________________________'}    Grade: ${plan.grade || '____________'}`)], spacing: { after: 120 } }),
        new Paragraph({ children: [new TextRun(`Teacher(s): ${plan.teacher || '______________________________'}    School: ${plan.school || '____________________'}`)], spacing: { after: 240 } }),
        table,
        new Paragraph({ children: [new TextRun({ text: 'Common Core Aligned Lesson:  Reflection', bold: true })], spacing: { before: 360, after: 160 } }),
        new Paragraph({ text: SCOE_REFLECTION_INTRO, spacing: { after: 80 } }),
        ...(plan.shiftReflection ? plan.shiftReflection.split('\n').map(p => new Paragraph({ text: p, spacing: { after: 160 } })) : []),
        new Paragraph({ text: SCOE_REFLECTION_CHOICE, spacing: { before: 160, after: 120 } }),
        ...SCOE_REFLECTION_QUESTIONS.map(q => new Paragraph({ text: q, bullet: { level: 0 } })),
        ...(plan.reflectionQuestion ? [
          new Paragraph({ children: [new TextRun({ text: plan.reflectionQuestion, bold: true })], spacing: { before: 200, after: 80 } }),
          ...(plan.reflectionAnswer || '').split('\n').map(p2 => new Paragraph({ text: p2, spacing: { after: 80 } })),
        ] : []),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slugify(plan.lessonTitle || 'lesson-plan')}.docx`);
}

/** Google Doc export with a real two-column table matching the template. */
export async function exportLessonPlanToGoogle(plan: LessonPlan): Promise<string> {
  const rowsHtml = SCOE_ROWS.map(row => `<tr>
      <td><p><b>${esc(row.label)}</b></p>${row.prompt ? `<p><i>${esc(row.prompt)}</i></p>` : ''}${para(scoeVal(plan, row.key))}</td>
      <td><p></p></td>
    </tr>`).join('');
  const html = `<html><body>
    <h1 style="text-align:center">${esc(plan.lessonTitle || 'Lesson Plan')}</h1>
    <p>Subject(s): ${esc(plan.subjects || '______________________________')} &nbsp;&nbsp; Grade: ${esc(plan.grade || '____________')}</p>
    <p>Teacher(s): ${esc(plan.teacher || '______________________________')} &nbsp;&nbsp; School: ${esc(plan.school || '____________________')}</p>
    <table border="1" style="border-collapse:collapse;width:100%">
      <tr><td style="width:89%"><p><b>LESSON ELEMENT</b></p></td><td style="width:11%"><p><b>Notes</b></p></td></tr>
      ${rowsHtml}
    </table>
    <p><b>Common Core Aligned Lesson:&nbsp; Reflection</b></p>
    <p>${esc(SCOE_REFLECTION_INTRO)}</p>
    ${para(plan.shiftReflection || '')}
    <p>${esc(SCOE_REFLECTION_CHOICE)}</p>
    <ul>${SCOE_REFLECTION_QUESTIONS.map(q => `<li>${esc(q)}</li>`).join('')}</ul>
    ${plan.reflectionQuestion ? `<p><b>${esc(plan.reflectionQuestion)}</b></p>${para(plan.reflectionAnswer || '')}` : ''}
  </body></html>`;
  const { url } = await createGoogleDoc(plan.lessonTitle || 'Lesson Plan', html);
  return url;
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
