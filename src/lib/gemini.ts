export interface DifferentiatedVersions {
  iep: string;
  ell: string;
  gifted: string;
}

export interface AIFailure {
  type: string;
  severity: "High" | "Medium" | "Low";
  explanation: string;
  fix: string;
}

export interface AnalysisResult {
  resilienceScore: number;
  summary: string;
  aiFailureBreakdown?: {
    headline: string;
    failures: AIFailure[];
  };
  dimensions: {
    name: string;
    score: number;
    explanation: string;
  }[];
  suggestions: {
    level: "Bronze" | "Silver" | "Gold";
    title: string;
    description: string;
    modifiedAssignment: string;
    differentiatedVersions?: DifferentiatedVersions;
  }[];
}

export type AIPreference = "avoid" | "augment" | "embrace";
export type BloomsLevel = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";

export const BLOOMS_LEVELS: BloomsLevel[] = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

export interface FrameworkDimension {
  name: string;
  description: string;
}

export const DEFAULT_DIMENSIONS: FrameworkDimension[] = [
  { name: "Anchor", description: "Local & Temporal Context: Grounding in 'The Now' and 'The Here' (Classroom, Temporal, or Proprietary anchors)." },
  { name: "Proprietary", description: "Bespoke Material: Integration of unique classroom artifacts (handouts, specific seminar debates, or unpublished data) that exist outside of AI training sets." },
  { name: "Audit", description: "The Process Trail: Shifting focus from result to labor (Revision Memos, Digital History, Failed Logic Reflection)." },
  { name: "Agency", description: "Personal Narrative: Integration of student's own professional/personal trajectory (Professional Lens, Reflective Synthesis)." },
];

export async function analyzeAssignment(
  text: string,
  aiPreference: AIPreference = "avoid",
  customDimensions: FrameworkDimension[] = DEFAULT_DIMENSIONS,
  activeFramework: "triple-a" | "blooms" = "triple-a",
  bloomsLevel?: BloomsLevel,
  subject?: string,
  gradeLevel?: string
): Promise<AnalysisResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      aiPreference,
      dimensions: customDimensions,
      activeFramework,
      bloomsLevel: bloomsLevel || "Analyze",
      subject: subject || "",
      gradeLevel: gradeLevel || "",
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const result = await response.json();

  if (
    typeof result.resilienceScore !== "number" ||
    !Array.isArray(result.dimensions) ||
    !Array.isArray(result.suggestions)
  ) {
    throw new Error("Unexpected response shape from analysis API.");
  }

  return result as AnalysisResult;
}
