export interface AssignmentTemplate {
  id: string;
  subject: string;
  gradeLevel: string;
  title: string;
  type: string;
  text: string;
  vulnerability: string;
}

export const TEMPLATES: AssignmentTemplate[] = [
  { id: 'eng-1', subject: 'English / Language Arts', gradeLevel: 'High School (9-12)', title: 'Character Analysis Essay', type: 'Essay', text: 'Write a 500-word essay analyzing the character development of the protagonist in the novel we read this unit. Use specific evidence from the text to support your argument.', vulnerability: 'High — fully completable by AI with a single prompt' },
  { id: 'eng-2', subject: 'English / Language Arts', gradeLevel: 'High School (9-12)', title: 'Persuasive Essay', type: 'Essay', text: 'Write a persuasive essay arguing for or against the following statement: "Social media does more harm than good for teenagers." Include at least three supporting arguments with evidence.', vulnerability: 'High — generic topic with no personal anchor' },
  { id: 'eng-3', subject: 'English / Language Arts', gradeLevel: 'Middle School (6-8)', title: 'Short Story Analysis', type: 'Analysis', text: 'Read the short story assigned in class. Write a 300-word analysis identifying the theme, explaining how the author develops it through plot and character.', vulnerability: 'Medium — AI knows most short stories' },
  { id: 'eng-4', subject: 'English / Language Arts', gradeLevel: 'High School (9-12)', title: 'Comparative Literature', type: 'Essay', text: 'Compare and contrast two characters from the texts we studied this semester. Discuss how each character responds to adversity and what this reveals about their respective societies.', vulnerability: 'High — broad comparison with no class-specific grounding' },
  { id: 'eng-5', subject: 'English / Language Arts', gradeLevel: 'Middle School (6-8)', title: 'Book Report', type: 'Report', text: 'Write a book report on the novel assigned this month. Include a summary, character descriptions, your favorite scene, and a personal rating with explanation.', vulnerability: 'High — AI has likely read the book' },
  { id: 'math-1', subject: 'Mathematics', gradeLevel: 'High School (9-12)', title: 'Rational Functions Application', type: 'Problem Set', text: 'Solve the following 10 rational function problems. Show all work and simplify your answers. For each problem, identify any restrictions on the domain.', vulnerability: 'High — AI solves these instantly and accurately' },
  { id: 'math-2', subject: 'Mathematics', gradeLevel: 'High School (9-12)', title: 'Statistics Project', type: 'Project', text: 'Collect data on a topic of your choice. Create a statistical analysis including measures of central tendency, standard deviation, and at least two data visualizations. Write a one-page summary of your findings.', vulnerability: 'Medium — data collection adds some friction' },
  { id: 'math-3', subject: 'Mathematics', gradeLevel: 'Middle School (6-8)', title: 'Word Problems', type: 'Problem Set', text: 'Solve the following 15 word problems involving proportions and percentages. Show all work and include units in your answers.', vulnerability: 'High — standard word problems are trivial for AI' },
  { id: 'math-4', subject: 'Mathematics', gradeLevel: 'High School (9-12)', title: 'Calculus Derivatives', type: 'Problem Set', text: 'Find the derivative of each function using the rules we covered in class. Show all steps and identify which rule you used for each problem.', vulnerability: 'High — AI handles derivatives perfectly' },
  { id: 'math-5', subject: 'Mathematics', gradeLevel: 'High School (9-12)', title: 'Real-World Math Application', type: 'Essay', text: 'Choose a real-world scenario where quadratic equations are used. Explain the scenario, set up the equation, solve it, and interpret the solution in context.', vulnerability: 'Medium-High — generic real-world framing' },
  { id: 'hist-1', subject: 'History / Social Studies', gradeLevel: 'High School (9-12)', title: 'Causes of WWI Essay', type: 'Essay', text: 'Write a 5-paragraph essay explaining the main causes of World War I. Include the MAIN (Militarism, Alliances, Imperialism, Nationalism) factors and provide specific historical examples.', vulnerability: 'High — classic essay AI can write perfectly' },
  { id: 'hist-2', subject: 'History / Social Studies', gradeLevel: 'High School (9-12)', title: 'Primary Source Analysis', type: 'Analysis', text: "Analyze the primary source document provided in class. Identify the author's purpose, audience, and historical context. Explain what the document reveals about the period.", vulnerability: 'Low-Medium — depends on whether AI has seen the document' },
  { id: 'hist-3', subject: 'History / Social Studies', gradeLevel: 'Middle School (6-8)', title: 'Civil Rights Movement', type: 'Research Paper', text: 'Research one figure from the Civil Rights Movement. Write a 3-page biography covering their early life, contributions, and legacy. Include at least 4 sources.', vulnerability: 'High — AI has extensive knowledge of civil rights figures' },
  { id: 'hist-4', subject: 'History / Social Studies', gradeLevel: 'High School (9-12)', title: 'Document Based Question (DBQ)', type: 'Essay', text: 'Using the documents provided and your knowledge of the period, write an essay that evaluates the extent to which economic factors caused the American Revolution.', vulnerability: 'Medium — depends on which documents are provided' },
  { id: 'hist-5', subject: 'History / Social Studies', gradeLevel: 'High School (9-12)', title: 'Current Events Analysis', type: 'Analysis', text: 'Find a current news article related to a topic from our unit. Summarize the article, connect it to at least two historical concepts we studied, and give your opinion on the issue.', vulnerability: 'Medium — current events add some temporal anchor' },
  { id: 'sci-1', subject: 'Science', gradeLevel: 'High School (9-12)', title: 'Lab Report', type: 'Lab Report', text: 'Write a formal lab report for the experiment we conducted in class. Include hypothesis, materials, procedure, data table, analysis, and conclusion following the format provided.', vulnerability: 'Low — class-specific data provides anchor' },
  { id: 'sci-2', subject: 'Science', gradeLevel: 'Middle School (6-8)', title: 'Climate Change Essay', type: 'Essay', text: 'Write a 400-word essay explaining the causes and effects of climate change. Use scientific evidence to support your claims and suggest two solutions.', vulnerability: 'High — generic science essay' },
  { id: 'phil-1', subject: 'Philosophy / Ethics', gradeLevel: 'High School (9-12)', title: 'Cave Allegory Analysis', type: 'Essay', text: "Write a 500-word essay explaining Plato's Allegory of the Cave. Describe the allegory, explain its philosophical meaning, and discuss one modern example that parallels the cave.", vulnerability: 'High — AI knows Plato extremely well' },
  { id: 'phil-2', subject: 'Philosophy / Ethics', gradeLevel: 'High School (9-12)', title: 'Ethical Dilemma Analysis', type: 'Essay', text: 'Choose one of the ethical dilemmas we discussed in class. Apply two different ethical frameworks to analyze the dilemma and explain which framework you find most persuasive and why.', vulnerability: 'Medium — generic unless tied to class discussions' },
];

export function getTemplatesBySubject(subject: string): AssignmentTemplate[] {
  if (!subject) return TEMPLATES.slice(0, 6);
  const match = TEMPLATES.filter(t =>
    t.subject.toLowerCase().includes(subject.toLowerCase().split('/')[0].trim()) ||
    subject.toLowerCase().includes(t.subject.toLowerCase().split('/')[0].trim())
  );
  return match.length > 0 ? match : TEMPLATES.slice(0, 6);
}
