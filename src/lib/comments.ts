// ─────────────────────────────────────────────────────────────────────────────
//  TEACHER COMMENTS
//  These appear (1) rotating on screen while an assignment is analyzed and
//  (2) on the Teacher Feedback page.
//
//  TO ADD A NEW COMMENT: copy one line below, paste it, and edit the text.
//  `quote` is what the teacher said; `role` is a generic attribution tag —
//  never use real names, specific grades, or specific subjects.
//  Keep quotes to roughly one or two sentences so they read well on screen.
// ─────────────────────────────────────────────────────────────────────────────

export interface TeacherComment {
  quote: string;
  role: string;
}

export const TEACHER_COMMENTS: TeacherComment[] = [
  { quote: "My students caught AI giving incorrect information — it became a major teaching moment about critical thinking.", role: "Pilot program teacher" },
  { quote: "I no longer use AI as the 'bad guy.' It's now a tool we use to facilitate learning.", role: "Pilot program teacher" },
  { quote: "My students knew more about the novel than the AI did — and they were proud of it.", role: "High school teacher" },
  { quote: "One assignment became a multi-source AI critique project. Huge success, especially for my lower-level classes.", role: "High school teacher" },
  { quote: "Students aren't afraid of AI as long as they journal their work along the way.", role: "Pilot program teacher" },
  { quote: "It wasn't harder for my students — it just forced them to actually think.", role: "High school teacher" },
];
