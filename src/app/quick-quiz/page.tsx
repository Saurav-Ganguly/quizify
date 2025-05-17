
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getQuizzes } from '@/lib/quiz-store';
import type { Quiz, Mcq } from '@/lib/types';
import { QuizInterface } from '@/components/quiz-interface';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const MAX_QUICK_QUIZ_QUESTIONS = 100;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function QuickQuizPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [quickQuizData, setQuickQuizData] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalMcqsAvailable, setTotalMcqsAvailable] = useState(0);

  const generateQuickQuiz = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setQuickQuizData(null);

    try {
      const allQuizzes = await getQuizzes();
      if (!allQuizzes || allQuizzes.length === 0) {
        setError("No quizzes available in the database to generate a quick quiz.");
        setTotalMcqsAvailable(0);
        setIsLoading(false);
        return;
      }

      let allMcqs: Mcq[] = [];
      allQuizzes.forEach(quiz => {
        if (quiz.mcqs && quiz.mcqs.length > 0) {
          allMcqs.push(...quiz.mcqs);
        }
      });
      
      setTotalMcqsAvailable(allMcqs.length);

      if (allMcqs.length === 0) {
        setError("No questions found in any of your quizzes. Please create some quizzes first.");
        setIsLoading(false);
        return;
      }

      const shuffledMcqs = shuffleArray(allMcqs);
      const selectedMcqs = shuffledMcqs.slice(0, MAX_QUICK_QUIZ_QUESTIONS);

      const quickQuiz: Quiz = {
        id: `quick-quiz-${new Date().getTime()}`, // Unique ID for this session's quick quiz
        subject: 'Comprehensive Quick Quiz',
        mcqs: selectedMcqs,
        createdAt: new Date().toISOString(),
        // pdfName, notes, pdfDataUri are not applicable here
      };
      setQuickQuizData(quickQuiz);
    } catch (e: any) {
      console.error("Failed to generate quick quiz:", e);
      setError(`Failed to generate quick quiz: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    generateQuickQuiz();
  }, [generateQuickQuiz]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg mt-4">Generating Quick Quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-lg mx-auto my-10 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Error Generating Quiz
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={generateQuickQuiz}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!quickQuizData || quickQuizData.mcqs.length === 0) {
     return (
      <Card className="w-full max-w-lg mx-auto my-10 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-6 w-6 text-primary" />
            No Questions Available
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Could not find any questions to build a Quick Quiz. 
            Please ensure you have quizzes with questions.
          </p>
          <Button onClick={generateQuickQuiz}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try to Regenerate
          </Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold">{quickQuizData.subject}</h1>
            <p className="text-muted-foreground">
                {quickQuizData.mcqs.length} questions selected from {totalMcqsAvailable} available.
            </p>
        </div>
        <Button onClick={generateQuickQuiz} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Generate New Quick Quiz
        </Button>
      </div>
      <QuizInterface quiz={quickQuizData} />
    </div>
  );
}
