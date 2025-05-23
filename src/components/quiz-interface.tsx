
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import type { Mcq, Quiz, QuizAttempt } from '@/lib/types';
import { saveQuizAttempt } from '@/lib/quiz-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Lightbulb, ChevronLeft, ChevronRight, Send, Loader2, Sparkles } from 'lucide-react';
import { QuizResultSummary } from './quiz-result-summary';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { elaborateMcqExplanation, type ElaborateMcqExplanationInput } from '@/ai/flows/elaborate-mcq-explanation';

interface QuizInterfaceProps {
  quiz: Quiz;
  initialAttempt?: QuizAttempt; // For review mode or resuming
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';

// Helper function to convert markdown-like text to HTML
const formatExplanationToHtml = (text: string | undefined): string => {
  if (!text) return '';

  let processedText = text;

  // 1. Bolding:
  // Handle **text** (stronger emphasis) first
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Handle *text* (AI prompt asked for *this* to be bold)
  // This regex looks for an asterisk, then any character that is NOT an asterisk (to avoid conflict with **),
  // followed by more non-asterisk characters, and then a closing asterisk.
  processedText = processedText.replace(/\*([^*]+?)\*/g, '<strong>$1</strong>');


  // 2. Paragraphs and Lists:
  // Normalize newlines and then split into logical blocks (paragraphs or list groups)
  // A block is separated by one or more blank lines.
  const blocks = processedText.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  let htmlOutput = '';

  blocks.forEach(block => {
    if (!block.trim()) return; // Skip empty blocks

    const lines = block.split('\n');
    let isUl = false;
    let isOl = false;
    
    // Check the first non-empty line to determine if the block is a list
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
      // Treat as a paragraph block, join lines with <br /> within a single <p>.
      // Filter out empty lines that were just for spacing within a text block.
      const paragraphContent = lines.filter(l => l.trim() !== '').join('<br />');
      if (paragraphContent) {
        htmlOutput += `<p>${paragraphContent}</p>`;
      }
    }
  });

  return htmlOutput;
};


export function QuizInterface({ quiz, initialAttempt }: QuizInterfaceProps) {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    initialAttempt?.answers || Array(quiz.mcqs.length).fill(null)
  );
  const [answerStatuses, setAnswerStatuses] = useState<AnswerStatus[]>(
    initialAttempt 
      ? initialAttempt.answers.map((ans, idx) => {
          if (ans === null) return 'unanswered';
          return ans === quiz.mcqs[idx].correctAnswerIndex ? 'correct' : 'incorrect';
        })
      : Array(quiz.mcqs.length).fill('unanswered')
  );
  const [isSubmitted, setIsSubmitted] = useState<boolean[]>(
    initialAttempt ? Array(quiz.mcqs.length).fill(true) : Array(quiz.mcqs.length).fill(false)
  );
  const [quizFinished, setQuizFinished] = useState(!!initialAttempt);
  const [finalAttempt, setFinalAttempt] = useState<QuizAttempt | undefined>(initialAttempt);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  const [elaboratedExplanations, setElaboratedExplanations] = useState<Record<number, string | undefined>>({});
  const [isElaborating, setIsElaborating] = useState<Record<number, boolean>>({});

  const currentMcq = quiz.mcqs[currentQuestionIndex];

  const progressPercentage = useMemo(() => {
    const answeredCount = selectedAnswers.filter(ans => ans !== null).length;
    return (quiz.mcqs.length > 0 ? (answeredCount / quiz.mcqs.length) * 100 : 0);
  }, [selectedAnswers, quiz.mcqs.length]);


  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitted[currentQuestionIndex] || isSubmittingQuiz || isElaborating[currentQuestionIndex]) return; 
    
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newSelectedAnswers);
  };

  const finishQuiz = useCallback(async (finalAnswers: (number | null)[], finalStatuses: AnswerStatus[]) => {
    setIsSubmittingQuiz(true);
    try {
      const score = finalStatuses.filter(status => status === 'correct').length;
      const attempt = await saveQuizAttempt(quiz.id, finalAnswers, score, quiz.mcqs.length);
      setFinalAttempt(attempt);
      setQuizFinished(true);
      toast({
        title: "Quiz Finished!",
        description: `You scored ${score} out of ${quiz.mcqs.length}.`,
      });
    } catch (error) {
      console.error("Error saving quiz attempt:", error);
      toast({
        title: "Error",
        description: "Could not save your quiz attempt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingQuiz(false);
    }
  }, [quiz.id, quiz.mcqs.length, toast]);

  const handleSubmitAnswer = () => {
    if (selectedAnswers[currentQuestionIndex] === null) {
      toast({
        title: "No answer selected",
        description: "Please select an option before submitting.",
        variant: "destructive",
      });
      return;
    }

    const newIsSubmitted = [...isSubmitted];
    newIsSubmitted[currentQuestionIndex] = true;
    setIsSubmitted(newIsSubmitted);

    const newAnswerStatuses = [...answerStatuses];
    const isCorrect = selectedAnswers[currentQuestionIndex] === currentMcq.correctAnswerIndex;
    newAnswerStatuses[currentQuestionIndex] = isCorrect ? 'correct' : 'incorrect';
    setAnswerStatuses(newAnswerStatuses);

    // If all questions are submitted, finish the quiz
    if (newIsSubmitted.every(s => s === true)) {
      finishQuiz(selectedAnswers, newAnswerStatuses);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.mcqs.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      if (!quizFinished && isSubmitted.every(s => s === true)) {
         finishQuiz(selectedAnswers, answerStatuses);
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers(Array(quiz.mcqs.length).fill(null));
    setAnswerStatuses(Array(quiz.mcqs.length).fill('unanswered'));
    setIsSubmitted(Array(quiz.mcqs.length).fill(false));
    setQuizFinished(false);
    setFinalAttempt(undefined);
    setElaboratedExplanations({});
    setIsElaborating({});
  };

  const handleElaborateExplanation = async () => {
    if (!currentMcq || isElaborating[currentQuestionIndex]) return;

    setIsElaborating(prev => ({ ...prev, [currentQuestionIndex]: true }));
    try {
      const input: ElaborateMcqExplanationInput = {
        subject: quiz.subject,
        question: currentMcq.question,
        options: currentMcq.options,
        correctAnswerIndex: currentMcq.correctAnswerIndex,
        currentExplanation: elaboratedExplanations[currentQuestionIndex] || currentMcq.explanation, // Use already elaborated if exists
      };
      const result = await elaborateMcqExplanation(input);
      setElaboratedExplanations(prev => ({ ...prev, [currentQuestionIndex]: result.elaboratedExplanation }));
      toast({
        title: "Explanation Elaborated",
        description: "A more detailed explanation has been generated.",
      });
    } catch (error) {
      console.error("Error elaborating explanation:", error);
      toast({
        title: "Elaboration Failed",
        description: "Could not generate a more detailed explanation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsElaborating(prev => ({ ...prev, [currentQuestionIndex]: false }));
    }
  };


  if (quizFinished && finalAttempt) {
    return <QuizResultSummary quiz={quiz} attempt={finalAttempt} onRetake={handleRetakeQuiz} />;
  }

  const questionSubmitted = isSubmitted[currentQuestionIndex];
  const currentStatus = answerStatuses[currentQuestionIndex];
  const displayExplanationString = elaboratedExplanations[currentQuestionIndex] || currentMcq?.explanation;
  const explanationHtml = formatExplanationToHtml(displayExplanationString);


  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-2xl">{quiz.subject} Quiz</CardTitle>
            <span className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {quiz.mcqs.length}
            </span>
          </div>
          <Progress value={progressPercentage} className="w-full h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg font-semibold">{currentMcq?.question}</p>
          
          <RadioGroup
            value={selectedAnswers[currentQuestionIndex]?.toString()}
            onValueChange={(value) => handleOptionSelect(parseInt(value))}
            disabled={questionSubmitted || isSubmittingQuiz || isElaborating[currentQuestionIndex]}
            className="space-y-3"
          >
            {currentMcq?.options.map((option, index) => {
              let itemStyle = "";
              if (questionSubmitted) {
                if (index === currentMcq.correctAnswerIndex) {
                  itemStyle = "border-green-500 bg-green-500/10";
                } else if (index === selectedAnswers[currentQuestionIndex]) {
                  itemStyle = "border-red-500 bg-red-500/10";
                }
              }

              return (
                <Label
                  key={index}
                  htmlFor={`option-${index}`}
                  className={cn(
                    "flex items-center space-x-3 p-4 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                    itemStyle,
                    selectedAnswers[currentQuestionIndex] === index && !questionSubmitted ? "border-primary bg-primary/10" : "",
                    questionSubmitted || isSubmittingQuiz || isElaborating[currentQuestionIndex] ? "cursor-default opacity-70" : ""
                  )}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={questionSubmitted || isSubmittingQuiz || isElaborating[currentQuestionIndex]}/>
                  <span>{option}</span>
                  {questionSubmitted && index === currentMcq.correctAnswerIndex && <CheckCircle className="ml-auto h-5 w-5 text-green-600" />}
                  {questionSubmitted && index === selectedAnswers[currentQuestionIndex] && index !== currentMcq.correctAnswerIndex && <XCircle className="ml-auto h-5 w-5 text-red-600" />}
                </Label>
              );
            })}
          </RadioGroup>

          {questionSubmitted && currentMcq && (
            <Alert variant={currentStatus === 'correct' ? 'default' : 'destructive'} className={currentStatus === 'correct' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <Lightbulb className="h-5 w-5" />
              <AlertTitle>
                {currentStatus === 'correct' ? 'Correct!' : 'Incorrect.'}
              </AlertTitle>
              <AlertDescription className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: `<strong>Explanation:</strong> ${explanationHtml}` }} />
              </AlertDescription>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleElaborateExplanation}
                  disabled={isElaborating[currentQuestionIndex] || isSubmittingQuiz}
                >
                  {isElaborating[currentQuestionIndex] ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {elaboratedExplanations[currentQuestionIndex] ? "Re-Elaborate" : "Elaborate Explanation"}
                </Button>
              </div>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0 || isSubmittingQuiz || isElaborating[currentQuestionIndex]}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          
          {!questionSubmitted ? (
            <Button onClick={handleSubmitAnswer} disabled={selectedAnswers[currentQuestionIndex] === null || isSubmittingQuiz || isElaborating[currentQuestionIndex]}>
              <Send className="mr-2 h-4 w-4" />
              Submit Answer
            </Button>
          ) : (
            currentQuestionIndex < quiz.mcqs.length - 1 ? (
              <Button onClick={handleNextQuestion} disabled={isSubmittingQuiz || isElaborating[currentQuestionIndex]}>
                Next Question <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => finishQuiz(selectedAnswers, answerStatuses)} disabled={isSubmittingQuiz || isElaborating[currentQuestionIndex]}>
                {isSubmittingQuiz ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Finish Quiz
              </Button>
            )
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
