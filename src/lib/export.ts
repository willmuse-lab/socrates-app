import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { AnalysisResult } from './gemini';

export async function exportToPDF(result: AnalysisResult, originalText: string) {
  const doc = new jsPDF();
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);

  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229);
  doc.text('Socrates Analysis Report', margin, y);
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
        new Paragraph({ text: "Socrates Analysis Report", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
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

export async function exportToGoogleDocs(result: AnalysisResult, originalText: string, docTitle: string): Promise<{ docUrl: string } | null> {
  const response = await fetch('/api/google/export-doc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, originalText, docTitle }),
  });
  if (response.status === 401) throw new Error('NOT_AUTHENTICATED');
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Export failed');
  }
  return response.json();
}
