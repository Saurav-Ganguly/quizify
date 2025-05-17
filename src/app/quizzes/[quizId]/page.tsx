
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getQuizById, getLatestAttemptForQuiz } from '@/lib/quiz-store';
import type { Quiz as QuizType, QuizAttempt } from '@/lib/types';
import { QuizInterface } from '@/components/quiz-interface';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, BookOpen, FileText, StickyNote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = typeof params.quizId === 'string' ? params.quizId : '';
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<QuizType | null | undefined>(undefined); 
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (quizId) {
      const fetchQuizData = async () => {
        setIsLoading(true);
        try {
          const foundQuiz = await getQuizById(quizId);
          setQuiz(foundQuiz || null);
          if (foundQuiz) {
            const attempt = await getLatestAttemptForQuiz(quizId);
            setLatestAttempt(attempt || null); 
          } else {
            setLatestAttempt(null); 
          }
        } catch (error) {
          console.error("Failed to fetch quiz data:", error);
          toast({
            title: "Error",
            description: "Could not load the quiz data. Please try again.",
            variant: "destructive",
          });
          setQuiz(null); 
        } finally {
          setIsLoading(false);
        }
      };
      fetchQuizData();
    } else {
      setIsLoading(false);
      setQuiz(null); 
    }
  }, [quizId, toast]);

  if (isLoading || quiz === undefined || (latestAttempt === undefined && quiz !== null) ) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading quiz data...</p>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" /> {quiz.subject}
        </h1>
        <Button variant="outline" onClick={() => router.push('/quizzes')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Quizzes
        </Button>
      </div>

      <Tabs defaultValue="quiz" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="quiz"><FileText className="mr-2 h-4 w-4" />Quiz</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="mr-2 h-4 w-4" />Notes</TabsTrigger>
          <TabsTrigger value="pdf"><BookOpen className="mr-2 h-4 w-4" />View PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="quiz">
          <QuizInterface quiz={quiz} initialAttempt={latestAttempt === null ? undefined : latestAttempt} />
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Generated Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {quiz.notes && quiz.notes.trim() ? (
                <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                    {quiz.notes}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground">No notes available for this quiz.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdf">
          <Card>
            <CardHeader>
              <CardTitle>Original PDF Document</CardTitle>
            </CardHeader>
            <CardContent>
              {quiz.pdfDataUri ? (
                <iframe 
                  src={quiz.pdfDataUri} 
                  width="100%" 
                  height="800px" 
                  title={quiz.pdfName || "PDF Document"}
                  className="border rounded-md"
                />
              ) : (
                <p className="text-muted-foreground">PDF document not available for this quiz.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

