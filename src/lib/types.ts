
export type Mcq = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
};

export type Quiz = {
  id: string;
  subject: string;
  mcqs: Mcq[];
  createdAt: string; // ISO date string
  pdfName?: string; 
  notes?: string; // Combined notes from all pages
  pdfDataUri?: string; // Data URI of the original PDF
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  answers: (number | null)[]; // index of selected option for each MCQ, null if not answered
  score: number; // Number of correct answers
  totalQuestions: number;
  completedAt: string; // ISO date string
};

// This type can be used for the AI flow input that just needs MCQs
export type McqCollection = {
  mcqs: Mcq[];
  desiredCount: number;
};
