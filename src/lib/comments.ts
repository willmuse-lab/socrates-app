// ─────────────────────────────────────────────────────────────────────────────
//  TEACHER COMMENTS
//  These appear (1) rotating on screen while an assignment is analyzed and
//  (2) on the Teacher Feedback page.
//
//  TO ADD A NEW COMMENT: copy one line below, paste it, and edit the text.
//  `quote` is what the teacher said; `role` is an attribution tag naming
//  subject + grade band (e.g. "High School English Teacher") — never use
//  real names or a specific grade number, just the subject and level band.
//  Keep quotes to roughly one or two sentences so they read well on screen.
// ─────────────────────────────────────────────────────────────────────────────

export interface TeacherComment {
  quote: string;
  role: string;
}

export const TEACHER_COMMENTS: TeacherComment[] = [
  { quote: "My students caught AI giving incorrect information. It became a major teaching moment about critical thinking.", role: "High School English Teacher" },
  { quote: "I no longer use AI as the 'bad guy.' It's now a tool we use to facilitate learning.", role: "Middle & High School Math Teacher" },
  { quote: "My students knew more about the novel than the AI did, and they were proud of it.", role: "High School English Teacher" },
  { quote: "One assignment became a multi-source AI critique project. Huge success, especially for my lower-level classes.", role: "High School English Teacher" },
  { quote: "Students aren't afraid of AI as long as they journal their work along the way.", role: "Middle & High School Math Teacher" },
  { quote: "It wasn't harder for my students. It just forced them to actually think.", role: "High School English Teacher" },
];
