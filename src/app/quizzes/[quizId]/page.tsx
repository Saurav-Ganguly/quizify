
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getQuizById, getLatestAttemptForQuiz } from '@/lib/quiz-store';
import type { Quiz as QuizType, QuizAttempt } from '@/lib/types';
import { QuizInterface } from '@/components/quiz-interface';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = typeof params.quizId === 'string' ? params.quizId : '';
  
  const [quiz, setQuiz] = useState<QuizType | null | undefined>(undefined); // undefined for loading, null for not found
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | undefined>(undefined);

  useEffect(() => {
    if (quizId) {
      const foundQuiz = getQuizById(quizId);
      setQuiz(foundQuiz || null);
      if (foundQuiz) {
        setLatestAttempt(getLatestAttemptForQuiz(quizId));
      }
    }
  }, [quizId]);

  if (quiz === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading quiz...</p>
      </div>
    );
  }

  if (quiz === null) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">Quiz Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The quiz you are looking for does not exist or may have been deleted.
        </p>
        <Button asChild>
          <Link href="/quizzes">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quizzes
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <QuizInterface quiz={quiz} initialAttempt={latestAttempt} />
    </div>
  );
}
