
import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import type { Quiz, QuizAttempt, Mcq } from './types';

const QUIZZES_COLLECTION = 'quizzes';
const ATTEMPTS_COLLECTION = 'attempts';

// Helper to convert Firestore Timestamps to ISO strings if they exist
const mapDocToQuiz = (docData: any, id: string): Quiz => {
  return {
    id,
    subject: docData.subject,
    mcqs: docData.mcqs,
    createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate().toISOString() : docData.createdAt,
    pdfName: docData.pdfName,
    notes: docData.notes,
    pdfDataUri: docData.pdfDataUri,
  } as Quiz;
};

const mapDocToQuizAttempt = (docData: any, id: string): QuizAttempt => {
  return {
    ...docData,
    id,
    completedAt: docData.completedAt instanceof Timestamp ? docData.completedAt.toDate().toISOString() : docData.completedAt,
  } as QuizAttempt;
};


// --- Quizzes ---
export const getQuizzes = async (): Promise<Quiz[]> => {
  try {
    const quizzesCollection = collection(db, QUIZZES_COLLECTION);
    const q = query(quizzesCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => mapDocToQuiz(doc.data(), doc.id));
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return [];
  }
};

export const getUniqueSubjects = async (): Promise<string[]> => {
  try {
    const quizzes = await getQuizzes();
    const subjects = new Set(quizzes.map(quiz => quiz.subject));
    return Array.from(subjects).sort();
  } catch (error) {
    console.error("Error fetching unique subjects:", error);
    return [];
  }
};

export const getAllMcqsFromAllQuizzes = async (): Promise<Mcq[]> => {
  try {
    const allQuizzes = await getQuizzes(); 
    let allMcqs: Mcq[] = [];
    allQuizzes.forEach(quiz => {
      if (quiz.mcqs && quiz.mcqs.length > 0) {
        const sanitizedMcqs = quiz.mcqs.map(mcq => ({
          question: mcq.question,
          options: mcq.options,
          correctAnswerIndex: mcq.correctAnswerIndex,
          explanation: mcq.explanation,
        }));
        allMcqs.push(...sanitizedMcqs);
      }
    });
    return allMcqs;
  } catch (error) {
    console.error("Error fetching all MCQs from all quizzes:", error);
    return [];
  }
};

export const getQuizById = async (id: string): Promise<Quiz | undefined> => {
  try {
    const quizDocRef = doc(db, QUIZZES_COLLECTION, id);
    const docSnap = await getDoc(quizDocRef);
    if (docSnap.exists()) {
      return mapDocToQuiz(docSnap.data(), docSnap.id);
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching quiz by ID:", error);
    return undefined;
  }
};

export const saveQuiz = async (
  subject: string, 
  mcqs: Mcq[], 
  pdfName?: string, 
  notes?: string, 
  pdfDataUri?: string
): Promise<Quiz> => {
  try {
    const newQuizData = {
      subject,
      mcqs,
      pdfName: pdfName || null,
      notes: notes || null,
      pdfDataUri: pdfDataUri || null,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), newQuizData);
    
    return {
      id: docRef.id,
      subject,
      mcqs,
      pdfName,
      notes,
      pdfDataUri,
      createdAt: new Date().toISOString(), 
    };
  } catch (error) {
    console.error("Error saving quiz:", error);
    throw error; 
  }
};

export const deleteQuiz = async (id: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const quizDocRef = doc(db, QUIZZES_COLLECTION, id);
    batch.delete(quizDocRef);

    const attemptsQuery = query(collection(db, ATTEMPTS_COLLECTION), where('quizId', '==', id));
    const attemptsSnapshot = await getDocs(attemptsQuery);
    attemptsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error deleting quiz and its attempts:", error);
    throw error;
  }
};


// --- Quiz Attempts ---
export const getQuizAttempts = async (): Promise<QuizAttempt[]> => {
  try {
    const attemptsCollection = collection(db, ATTEMPTS_COLLECTION);
    const q = query(attemptsCollection, orderBy('completedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => mapDocToQuizAttempt(doc.data(), doc.id));
  } catch (error) {
    console.error("Error fetching quiz attempts:", error);
    return [];
  }
};

export const getAttemptsForQuiz = async (quizId: string): Promise<QuizAttempt[]> => {
  try {
    const attemptsCollection = collection(db, ATTEMPTS_COLLECTION);
    const q = query(attemptsCollection, where('quizId', '==', quizId), orderBy('completedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => mapDocToQuizAttempt(doc.data(), doc.id));
  } catch (error) {
    console.error("Error fetching attempts for quiz:", error);
    return [];
  }
};

export const getLatestAttemptForQuiz = async (quizId: string): Promise<QuizAttempt | undefined> => {
  try {
    const attemptsCollection = collection(db, ATTEMPTS_COLLECTION);
    const q = query(
      attemptsCollection,
      where('quizId', '==', quizId),
      orderBy('completedAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return mapDocToQuizAttempt(doc.data(), doc.id);
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching latest attempt for quiz:", error);
    return undefined;
  }
};

export const saveQuizAttempt = async (
  quizId: string,
  answers: (number | null)[],
  score: number,
  totalQuestions: number
): Promise<QuizAttempt> => {
  try {
    const newAttemptData = {
      quizId,
      answers,
      score,
      totalQuestions,
      completedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, ATTEMPTS_COLLECTION), newAttemptData);
    return {
      id: docRef.id,
      quizId,
      answers,
      score,
      totalQuestions,
      completedAt: new Date().toISOString(), 
    };
  } catch (error) {
    console.error("Error saving quiz attempt:", error);
    throw error;
  }
};

