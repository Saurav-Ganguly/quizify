
"use client";

import React, { useEffect, useState } from 'react';
import { getQuizzes, getLatestAttemptForQuiz, deleteQuiz } from '@/lib/quiz-store';
import type { Quiz, QuizAttempt } from '@/lib/types';
import { QuizCard } from '@/components/quiz-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, FileQuestion } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizAttemptsMap, setQuizAttemptsMap] = useState<Record<string, QuizAttempt | undefined>>({});
  const { toast } = useToast();

  const loadQuizzesAndAttempts = () => {
    const storedQuizzes = getQuizzes();
    setQuizzes(storedQuizzes.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    const attemptsMap: Record<string, QuizAttempt | undefined> = {};
    storedQuizzes.forEach(quiz => {
      attemptsMap[quiz.id] = getLatestAttemptForQuiz(quiz.id);
    });
    setQuizAttemptsMap(attemptsMap);
  };
  
  useEffect(() => {
    loadQuizzesAndAttempts();
  }, []);

  const handleDeleteQuiz = (quizId: string) => {
    deleteQuiz(quizId);
    loadQuizzesAndAttempts(); // Refresh the list
    toast({
      title: "Quiz Deleted",
      description: "The quiz and its attempts have been removed.",
    });
  };

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
