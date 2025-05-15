
"use client";

import React, { useEffect, useState } from 'react';
import { getQuizzes, getLatestAttemptForQuiz, deleteQuiz } from '@/lib/quiz-store';
import type { Quiz, QuizAttempt } from '@/lib/types';
import { QuizCard } from '@/components/quiz-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, FileQuestion, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizAttemptsMap, setQuizAttemptsMap] = useState<Record<string, QuizAttempt | undefined>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadQuizzesAndAttempts = async () => {
    setIsLoading(true);
    try {
      const storedQuizzes = await getQuizzes();
      // Sorting is already handled by Firestore query if 'createdAt' is a Timestamp
      // If 'createdAt' is string, sort here:
      // setQuizzes(storedQuizzes.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setQuizzes(storedQuizzes);

      const attemptsMap: Record<string, QuizAttempt | undefined> = {};
      for (const quiz of storedQuizzes) {
        attemptsMap[quiz.id] = await getLatestAttemptForQuiz(quiz.id);
      }
      setQuizAttemptsMap(attemptsMap);
    } catch (error) {
      console.error("Failed to load quizzes and attempts:", error);
      toast({
        title: "Error",
        description: "Could not load your quizzes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadQuizzesAndAttempts();
  }, []);

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
      await loadQuizzesAndAttempts(); // Refresh the list
      toast({
        title: "Quiz Deleted",
        description: "The quiz and its attempts have been removed.",
      });
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      toast({
        title: "Error",
        description: "Could not delete the quiz. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading quizzes...</p>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-10">
        <FileQuestion className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">No Quizzes Yet</h2>
        <p className="text-muted-foreground mb-6">
          It looks like you haven't created any quizzes. <br/>
          Get started by generating MCQs from a PDF.
        </p>
        <Button asChild size="lg">
          <Link href="/">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Quiz
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Quizzes</h1>
        <Button asChild>
          <Link href="/">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Quiz
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <QuizCard 
            key={quiz.id} 
            quiz={quiz} 
            latestAttempt={quizAttemptsMap[quiz.id]}
            onDelete={handleDeleteQuiz}
          />
        ))}
      </div>
    </div>
  );
}
