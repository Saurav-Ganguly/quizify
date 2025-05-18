
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { getQuizzes, getLatestAttemptForQuiz, deleteQuiz } from '@/lib/quiz-store';
import type { Quiz, QuizAttempt } from '@/lib/types';
import { QuizCard } from '@/components/quiz-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, FileQuestion, Loader2, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface GroupedQuizzes {
  [subject: string]: Quiz[];
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [groupedQuizzes, setGroupedQuizzes] = useState<GroupedQuizzes>({});
  const [quizAttemptsMap, setQuizAttemptsMap] = useState<Record<string, QuizAttempt | undefined>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadQuizzesAndAttempts = async () => {
    setIsLoading(true);
    try {
      const storedQuizzes = await getQuizzes();
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

  useEffect(() => {
    if (quizzes.length > 0) {
      const groups: GroupedQuizzes = quizzes.reduce((acc, quiz) => {
        const subject = quiz.subject || "Uncategorized";
        if (!acc[subject]) {
          acc[subject] = [];
        }
        acc[subject].push(quiz);
        return acc;
      }, {} as GroupedQuizzes);
      setGroupedQuizzes(groups);
    } else {
      setGroupedQuizzes({});
    }
  }, [quizzes]);

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

  const sortedSubjects = useMemo(() => {
    return Object.keys(groupedQuizzes).sort((a, b) => a.localeCompare(b));
  }, [groupedQuizzes]);

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
      
      <Accordion type="multiple" className="w-full space-y-4">
        {sortedSubjects.map((subject) => (
          <AccordionItem value={subject} key={subject} className="bg-card border border-border rounded-lg shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-6 w-6 text-primary" />
                <span className="text-xl font-semibold">{subject}</span>
                <span className="text-sm text-muted-foreground">({groupedQuizzes[subject].length} quiz/zes)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedQuizzes[subject].map((quiz) => (
                  <QuizCard 
                    key={quiz.id} 
                    quiz={quiz} 
                    latestAttempt={quizAttemptsMap[quiz.id]}
                    onDelete={handleDeleteQuiz}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
