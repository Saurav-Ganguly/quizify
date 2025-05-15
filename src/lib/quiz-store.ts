
import type { Quiz, QuizAttempt, Mcq } from './types';

const QUIZZES_KEY = 'quizify_quizzes';
const ATTEMPTS_KEY = 'quizify_attempts';

// Helper to safely parse JSON from localStorage
const safelyParseJSON = <T>(jsonString: string | null, defaultValue: T): T => {
  if (typeof window === 'undefined' || jsonString === null) {
    return defaultValue;
  }
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Error parsing JSON from localStorage:", error);
    return defaultValue;
  }
};

// --- Quizzes ---
export const getQuizzes = (): Quiz[] => {
  if (typeof window === 'undefined') return [];
  const quizzesJson = localStorage.getItem(QUIZZES_KEY);
  return safelyParseJSON(quizzesJson, []);
};

export const getQuizById = (id: string): Quiz | undefined => {
  if (typeof window === 'undefined') return undefined;
  return getQuizzes().find(quiz => quiz.id === id);
};

export const saveQuiz = (subject: string, mcqs: Mcq[], pdfName?: string): Quiz => {
  if (typeof window === 'undefined') {
    // This case should ideally be handled by disabling UI or showing an error
    // For now, return a dummy quiz structure or throw error
    throw new Error("localStorage is not available. Cannot save quiz.");
  }
  const quizzes = getQuizzes();
  const newQuiz: Quiz = {
    id: crypto.randomUUID(),
    subject,
    mcqs,
    pdfName,
    createdAt: new Date().toISOString(),
  };
  quizzes.push(newQuiz);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
  return newQuiz;
};

export const deleteQuiz = (id: string): void => {
  if (typeof window === 'undefined') return;
  let quizzes = getQuizzes();
  quizzes = quizzes.filter(quiz => quiz.id !== id);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));

  // Also delete associated attempts
  let attempts = getQuizAttempts();
  attempts = attempts.filter(attempt => attempt.quizId !== id);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
};


// --- Quiz Attempts ---
export const getQuizAttempts = (): QuizAttempt[] => {
  if (typeof window === 'undefined') return [];
  const attemptsJson = localStorage.getItem(ATTEMPTS_KEY);
  return safelyParseJSON(attemptsJson, []);
};

export const getAttemptsForQuiz = (quizId: string): QuizAttempt[] => {
  if (typeof window === 'undefined') return [];
  return getQuizAttempts().filter(attempt => attempt.quizId === quizId);
};

export const getLatestAttemptForQuiz = (quizId: string): QuizAttempt | undefined => {
  if (typeof window === 'undefined') return undefined;
  const attempts = getAttemptsForQuiz(quizId);
  if (attempts.length === 0) return undefined;
  return attempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
};

export const saveQuizAttempt = (
  quizId: string,
  answers: (number | null)[],
  score: number,
  totalQuestions: number
): QuizAttempt => {
  if (typeof window === 'undefined') {
     throw new Error("localStorage is not available. Cannot save quiz attempt.");
  }
  const attempts = getQuizAttempts();
  const newAttempt: QuizAttempt = {
    id: crypto.randomUUID(),
    quizId,
    answers,
    score,
    totalQuestions,
    completedAt: new Date().toISOString(),
  };
  attempts.push(newAttempt);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  return newAttempt;
};
