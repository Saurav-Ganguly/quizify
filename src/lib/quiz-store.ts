
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
  serverTimestamp // Potentially use for createdAt
} from 'firebase/firestore';
import type { Quiz, QuizAttempt, Mcq } from './types';

const QUIZZES_COLLECTION = 'quizzes';
const ATTEMPTS_COLLECTION = 'attempts';

// Helper to convert Firestore Timestamps to ISO strings if they exist
const mapDocToQuiz = (docData: any, id: string): Quiz => {
  return {
    ...docData,
    id,
    createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate().toISOString() : docData.createdAt,
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

export const saveQuiz = async (subject: string, mcqs: Mcq[], pdfName?: string): Promise<Quiz> => {
  try {
    const newQuizData = {
      subject,
      mcqs,
      pdfName: pdfName || null,
      createdAt: serverTimestamp(), // Use server timestamp for creation
    };
    const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), newQuizData);
    
    // To return the full quiz object with the server-generated timestamp resolved
    // We fetch it back. Alternatively, we can construct it optimistically.
    // For simplicity, let's construct it with a client-side timestamp for immediate return,
    // knowing the server will store the precise one.
    // The getQuizzes/getQuizById will fetch the server timestamp.
    return {
      id: docRef.id,
      subject,
      mcqs,
      pdfName,
      createdAt: new Date().toISOString(), // Client-side timestamp for immediate return
    };
  } catch (error) {
    console.error("Error saving quiz:", error);
    throw error; // Re-throw to be handled by the caller
  }
};

export const deleteQuiz = async (id: string): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // Delete the quiz document
    const quizDocRef = doc(db, QUIZZES_COLLECTION, id);
    batch.delete(quizDocRef);

    // Delete associated attempts
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
      completedAt: serverTimestamp(), // Use server timestamp
    };
    const docRef = await addDoc(collection(db, ATTEMPTS_COLLECTION), newAttemptData);
    // Similar to saveQuiz, returning a client-side timestamp for immediate use.
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
