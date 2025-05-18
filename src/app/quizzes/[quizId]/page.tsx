
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getQuizById, getLatestAttemptForQuiz, getAllMcqsFromAllQuizzes } from '@/lib/quiz-store';
import type { Quiz as QuizType, QuizAttempt, Mcq } from '@/lib/types';
import { QuizInterface } from '@/components/quiz-interface';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, BookOpen, FileText, StickyNote, Zap, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateBestMcqs } from '@/ai/flows/generate-best-mcqs';

// Helper function to convert markdown-like text to HTML for notes
const formatNotesToHtml = (text: string | undefined): string => {
  if (!text) return '';

  let processedText = text;

  // 1. Bolding:
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  processedText = processedText.replace(/\*([^*]+?)\*/g, '<strong>$1</strong>');


  // 2. Paragraphs and Lists:
  const blocks = processedText.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  let htmlOutput = '';

  blocks.forEach(block => {
    if (!block.trim()) return;

    const lines = block.split('\n');
    let isUl = false;
    let isOl = false;
    
    const firstRealLine = lines.find(l => l.trim() !== '');
    if (firstRealLine) {
        if (firstRealLine.trim().startsWith('- ') || firstRealLine.trim().startsWith('* ')) {
            isUl = lines.every(l => l.trim() === '' || l.trim().startsWith('- ') || l.trim().startsWith('* '));
        } else if (firstRealLine.trim().match(/^\d+\.\s+/)) {
            isOl = lines.every(l => l.trim() === '' || l.trim().match(/^\d+\.\s+/));
        }
    }
    
    if (isUl) {
      htmlOutput += '<ul>';
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          htmlOutput += `<li>${trimmedLine.substring(2)}</li>`;
        }
      });
      htmlOutput += '</ul>';
    } else if (isOl) {
      htmlOutput += '<ol>';
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.match(/^\d+\.\s+/)) {
          htmlOutput += `<li>${trimmedLine.replace(/^\d+\.\s+/, '')}</li>`;
        }
      });
      htmlOutput += '</ol>';
    } else {
      const paragraphContent = lines.filter(l => l.trim() !== '').join('<br />');
      if (paragraphContent) {
        htmlOutput += `<p>${paragraphContent}</p>`;
      }
    }
  });

  return htmlOutput;
};

const QUICK_QUIZ_DESIRED_COUNT = 100;

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = typeof params.quizId === 'string' ? params.quizId : '';
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<QuizType | null | undefined>(undefined); 
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const [quickQuizData, setQuickQuizData] = useState<QuizType | null>(null);
  const [isGeneratingQuickQuiz, setIsGeneratingQuickQuiz] = useState(false);
  const [quickQuizError, setQuickQuizError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pdf");

  // State for all MCQs for the Quick Quiz tab
  const [allMcqsForQuickQuiz, setAllMcqsForQuickQuiz] = useState<Mcq[] | null>(null);
  const [isLoadingAllMcqs, setIsLoadingAllMcqs] = useState(true);


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

  // Fetch all MCQs once on component mount for the Quick Quiz tab
  useEffect(() => {
    const fetchAllMcqsData = async () => {
      setIsLoadingAllMcqs(true);
      try {
        const mcqs = await getAllMcqsFromAllQuizzes();
        setAllMcqsForQuickQuiz(mcqs);
      } catch (error) {
        console.error("Failed to fetch all MCQs for Quick Quiz tab:", error);
        toast({
          title: "Error Loading Quick Quiz Data",
          description: "Could not retrieve all questions for the Quick Quiz feature.",
          variant: "destructive",
        });
        setAllMcqsForQuickQuiz([]); // Set to empty array on error
      } finally {
        setIsLoadingAllMcqs(false);
      }
    };
    fetchAllMcqsData();
  }, [toast]);

  const notesHtml = useMemo(() => {
    if (quiz?.notes) {
      return formatNotesToHtml(quiz.notes);
    }
    return '';
  }, [quiz?.notes]);

  const handleGenerateQuickQuiz = useCallback(async () => {
    if (!allMcqsForQuickQuiz || allMcqsForQuickQuiz.length < QUICK_QUIZ_DESIRED_COUNT) {
      setQuickQuizError(`Quick Quiz requires at least ${QUICK_QUIZ_DESIRED_COUNT} questions. You have ${allMcqsForQuickQuiz?.length || 0}.`);
       toast({
        title: "Quick Quiz Condition Not Met",
        description: `The AI-powered Quick Quiz needs ${QUICK_QUIZ_DESIRED_COUNT} or more questions. You currently have ${allMcqsForQuickQuiz?.length || 0}.`,
        variant: "default",
      });
      return;
    }

    setIsGeneratingQuickQuiz(true);
    setQuickQuizError(null);
    setQuickQuizData(null);
    try {
      toast({ title: "Generating Quick Quiz", description: `AI is selecting the best ${QUICK_QUIZ_DESIRED_COUNT} questions from ${allMcqsForQuickQuiz.length} available... This might take a moment.`});

      const result = await generateBestMcqs({ allMcqs: allMcqsForQuickQuiz, desiredCount: QUICK_QUIZ_DESIRED_COUNT });
      
      if (result.selectedMcqs.length === 0) {
        setQuickQuizError("AI could not select any questions for the Quick Quiz. Please try again.");
        setIsGeneratingQuickQuiz(false);
        return;
      }

      const comprehensiveQuickQuiz: QuizType = {
        id: `quick-quiz-${new Date().getTime()}`,
        subject: 'Comprehensive Quick Quiz',
        mcqs: result.selectedMcqs,
        createdAt: new Date().toISOString(),
      };
      setQuickQuizData(comprehensiveQuickQuiz);
      toast({ title: "Quick Quiz Ready!", description: `${result.selectedMcqs.length} questions selected.`});

    } catch (e: any) {
      console.error("Failed to generate quick quiz:", e);
      setQuickQuizError(`Failed to generate quick quiz: ${e.message || "An unknown error occurred."}`);
      toast({
        title: "Quick Quiz Generation Failed",
        description: e.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuickQuiz(false);
    }
  }, [allMcqsForQuickQuiz, toast]);


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
  
  let quickQuizTabInternalContent;
  if (isLoadingAllMcqs) {
    quickQuizTabInternalContent = (
      <div className="text-center space-y-3">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Checking total questions for Quick Quiz...</p>
      </div>
    );
  } else if (allMcqsForQuickQuiz && allMcqsForQuickQuiz.length < QUICK_QUIZ_DESIRED_COUNT) {
    quickQuizTabInternalContent = (
      <div className="text-center space-y-3 p-4 border border-blue-500/50 bg-blue-100 dark:bg-blue-900/30 rounded-md max-w-md mx-auto">
        <Info className="h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto" />
        <p className="font-semibold text-blue-700 dark:text-blue-300">AI Quick Quiz Information</p>
        <p className="text-sm text-muted-foreground">
          The AI-powered Quick Quiz selects the best {QUICK_QUIZ_DESIRED_COUNT} questions from your entire question bank.
          This feature is active when you have {QUICK_QUIZ_DESIRED_COUNT} or more questions.
        </p>
        <p className="text-sm text-muted-foreground">
          You currently have {allMcqsForQuickQuiz.length} questions. Please generate more quizzes to use this feature.
        </p>
      </div>
    );
  } else if (allMcqsForQuickQuiz) { // Implies length >= QUICK_QUIZ_DESIRED_COUNT
      if (isGeneratingQuickQuiz) {
        quickQuizTabInternalContent = (
            <div className="text-center space-y-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">AI is selecting the best questions... This may take a moment.</p>
            </div>
        );
      } else if (quickQuizError) {
        quickQuizTabInternalContent = (
            <div className="text-center space-y-3 p-4 border border-destructive/50 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
                <p className="font-semibold">Error Generating Quick Quiz</p>
                <p className="text-sm text-muted-foreground">{quickQuizError}</p>
                <Button onClick={handleGenerateQuickQuiz} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                </Button>
            </div>
        );
      } else if (quickQuizData) {
        quickQuizTabInternalContent = (
            <div className="w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{quickQuizData.subject}</h2>
                    <Button onClick={handleGenerateQuickQuiz} variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                    </Button>
                </div>
                <QuizInterface quiz={quickQuizData} />
            </div>
        );
      } else {
        quickQuizTabInternalContent = (
            <Button onClick={handleGenerateQuickQuiz} size="lg">
                <Zap className="mr-2 h-5 w-5" /> Generate Quick Quiz
            </Button>
        );
      }
  } else { // Error fetching allMcqsForQuickQuiz (e.g. it's null)
     quickQuizTabInternalContent = (
      <div className="text-center space-y-3 p-4 border border-destructive/50 bg-destructive/10 rounded-md">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
        <p className="font-semibold">Error</p>
        <p className="text-sm text-muted-foreground">Could not load data for the Quick Quiz feature.</p>
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

      <Tabs defaultValue="pdf" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="pdf"><BookOpen className="mr-2 h-4 w-4" />View PDF</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="mr-2 h-4 w-4" />Notes</TabsTrigger>
          <TabsTrigger value="quiz"><FileText className="mr-2 h-4 w-4" />Quiz</TabsTrigger>
          <TabsTrigger value="quick-quiz"><Zap className="mr-2 h-4 w-4" />Quick Quiz</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pdf">
          <Card>
            <CardHeader>
              <CardTitle>Original PDF Document</CardTitle>
               {quiz.pdfName && <CardDescription>{quiz.pdfName}</CardDescription>}
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

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Generated Notes</CardTitle>
              <CardDescription>Exam-focused notes generated from the PDF content.</CardDescription>
            </CardHeader>
            <CardContent>
              {notesHtml && notesHtml.trim() ? (
                <ScrollArea className="h-[700px] w-full rounded-md border p-4">
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: notesHtml }} 
                  />
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground">No notes available for this quiz.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quiz">
          <QuizInterface quiz={quiz} initialAttempt={latestAttempt === null ? undefined : latestAttempt} />
        </TabsContent>

        <TabsContent value="quick-quiz">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive AI Quick Quiz</CardTitle>
              <CardDescription>
                A quiz with up to {QUICK_QUIZ_DESIRED_COUNT} of the best questions from all your generated material, selected by AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px] flex flex-col items-center justify-center">
              {quickQuizTabInternalContent}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

