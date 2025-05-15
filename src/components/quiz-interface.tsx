
"use client";

import React, { useState, useMemo } from 'react';
import type { Mcq, Quiz, QuizAttempt } from '@/lib/types';
import { saveQuizAttempt } from '@/lib/quiz-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Lightbulb, ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import { QuizResultSummary } from './quiz-result-summary';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

interface QuizInterfaceProps {
  quiz: Quiz;
  initialAttempt?: QuizAttempt; // For review mode or resuming
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';

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
  const [isSubmitting, setIsSubmitting] = useState(false); // For saveQuizAttempt loading state

  const currentMcq = quiz.mcqs[currentQuestionIndex];

  const progressPercentage = useMemo(() => {
    const answeredCount = selectedAnswers.filter(ans => ans !== null).length;
    return (answeredCount / quiz.mcqs.length) * 100;
  }, [selectedAnswers, quiz.mcqs.length]);


  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitted[currentQuestionIndex] || isSubmitting) return; 
    
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newSelectedAnswers);
  };

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
      finishQuiz(newSelectedAnswers, newAnswerStatuses);
    }
  };

  const finishQuiz = async (finalAnswers: (number | null)[], finalStatuses: AnswerStatus[]) => {
    setIsSubmitting(true);
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
      setIsSubmitting(false);
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
  };

  if (quizFinished && finalAttempt) {
    return <QuizResultSummary quiz={quiz} attempt={finalAttempt} onRetake={handleRetakeQuiz} />;
  }

  const questionSubmitted = isSubmitted[currentQuestionIndex];
  const currentStatus = answerStatuses[currentQuestionIndex];

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
          <p className="text-lg font-semibold">{currentMcq.question}</p>
          
          <RadioGroup
            value={selectedAnswers[currentQuestionIndex]?.toString()}
            onValueChange={(value) => handleOptionSelect(parseInt(value))}
            disabled={questionSubmitted || isSubmitting}
            className="space-y-3"
          >
            {currentMcq.options.map((option, index) => {
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
                    questionSubmitted || isSubmitting ? "cursor-default" : ""
                  )}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={questionSubmitted || isSubmitting}/>
                  <span>{option}</span>
                  {questionSubmitted && index === currentMcq.correctAnswerIndex && <CheckCircle className="ml-auto h-5 w-5 text-green-600" />}
                  {questionSubmitted && index === selectedAnswers[currentQuestionIndex] && index !== currentMcq.correctAnswerIndex && <XCircle className="ml-auto h-5 w-5 text-red-600" />}
                </Label>
              );
            })}
          </RadioGroup>

          {questionSubmitted && (
            <Alert variant={currentStatus === 'correct' ? 'default' : 'destructive'} className={currentStatus === 'correct' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <Lightbulb className="h-5 w-5" />
              <AlertTitle>
                {currentStatus === 'correct' ? 'Correct!' : 'Incorrect.'}
              </AlertTitle>
              <AlertDescription className="prose prose-sm max-w-none">
                <strong>Explanation:</strong> {currentMcq.explanation}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0 || isSubmitting}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          
          {!questionSubmitted ? (
            <Button onClick={handleSubmitAnswer} disabled={selectedAnswers[currentQuestionIndex] === null || isSubmitting}>
              {isSubmitting && currentQuestionIndex === quiz.mcqs.length -1 ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Answer
            </Button>
          ) : (
            currentQuestionIndex < quiz.mcqs.length - 1 ? (
              <Button onClick={handleNextQuestion} disabled={isSubmitting}>
                Next Question <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => finishQuiz(selectedAnswers, answerStatuses)} disabled={isSubmitting}>
                {isSubmitting ? (
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
