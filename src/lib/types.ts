
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
  // Optional: Store a brief summary or source filename
  pdfName?: string; 
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  answers: (number | null)[]; // index of selected option for each MCQ, null if not answered
  score: number; // Number of correct answers
  totalQuestions: number;
  completedAt: string; // ISO date string
};
