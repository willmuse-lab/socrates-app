// ─────────────────────────────────────────────────────────────────────────────
//  TEACHER COMMENTS
//  These scroll across the screen while an assignment is being analyzed.
//
//  TO ADD A NEW COMMENT: copy one line below, paste it, and edit the text.
//  Each entry needs a `quote` (what the teacher said) and a `name` (who said it).
//  Keep quotes to roughly one or two sentences so they read well while scrolling.
// ─────────────────────────────────────────────────────────────────────────────

export interface TeacherComment {
  quote: string;
  name: string;
}

export const TEACHER_COMMENTS: TeacherComment[] = [
  { quote: "Students caught AI giving incorrect information — it became a major teaching moment about critical thinking.", name: "Mrs. Davis, 10th Grade English" },
  { quote: "I no longer use AI as the 'bad guy.' It's now a tool we use to facilitate learning.", name: "Mr. Muse, Math" },
  { quote: "My students knew more about the novel than the AI did — and they were proud of it.", name: "Mrs. Davis, 10th Grade English" },
  { quote: "A character analysis became a multi-source AI critique project. Huge success, especially for my lower-level classes.", name: "Mrs. Davis, 10th Grade English" },
  { quote: "Students aren't afraid of AI as long as they journal the work and use the 'find the mistake' assignment.", name: "Mr. Muse, Math" },
  { quote: "It wasn't harder for my students — it just forced them to actually think.", name: "Mrs. Davis, 10th Grade English" },
];
