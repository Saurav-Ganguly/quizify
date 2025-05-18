
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Quiz, QuizAttempt } from '@/lib/types';
import { FileText, BookOpen, CalendarDays, Percent, Trash2, RotateCcw, Eye, StickyNote, Edit3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface QuizCardProps {
  quiz: Quiz;
  latestAttempt?: QuizAttempt;
  onDelete: (quizId: string) => void;
  onSavePdfName: (quizId: string, newName: string) => Promise<void>;
}

export function QuizCard({ quiz, latestAttempt, onDelete, onSavePdfName }: QuizCardProps) {
  const cardTitle = quiz.pdfName || quiz.subject || "Untitled Quiz";
  const cardDescription = quiz.pdfName ? `Subject: ${quiz.subject}` : `Created ${formatDistanceToNow(new Date(quiz.createdAt), { addSuffix: true })}`;

  const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState(false);
  const [newPdfName, setNewPdfName] = useState(quiz.pdfName || "");

  const handleSaveName = async () => {
    if (newPdfName.trim() === "") {
      // Optionally add a toast here to inform user that name cannot be empty
      return;
    }
    await onSavePdfName(quiz.id, newPdfName.trim());
    setIsEditNameDialogOpen(false);
  };

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {cardTitle}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <BookOpen className="w-3 h-3" />
              {cardDescription}
            </CardDescription>
          </div>
          <Dialog open={isEditNameDialogOpen} onOpenChange={setIsEditNameDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Edit Name">
                <Edit3 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Quiz Name</DialogTitle>
                <DialogDescription>
                  Change the PDF name associated with this quiz. This will update the title shown on the card.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pdfName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="pdfName"
                    value={newPdfName}
                    onChange={(e) => setNewPdfName(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter new PDF name"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveName}>Save Name</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <CalendarDays className="w-3 h-3" />
            Created {formatDistanceToNow(new Date(quiz.createdAt), { addSuffix: true })}
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span>{quiz.mcqs.length} questions</span>
        </div>
        {quiz.notes && quiz.notes.length > 5 && (
           <div className="flex items-center gap-2 text-sm">
            <StickyNote className="w-4 h-4 text-muted-foreground" />
            <span>Notes available</span>
          </div>
        )}
        {latestAttempt && (
          <div className="flex items-center gap-2 text-sm">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span>
              Last score: {latestAttempt.score}/{latestAttempt.totalQuestions} ({Math.round((latestAttempt.score / latestAttempt.totalQuestions) * 100)}%)
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
        <div className="flex gap-2">
          <Link href={`/quizzes/${quiz.id}`} passHref>
            <Button variant="default" size="sm">
              {latestAttempt ? <RotateCcw className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {latestAttempt ? "Retake / Review" : "Open"}
            </Button>
          </Link>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" title="Delete Quiz">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the quiz
                and all associated attempts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(quiz.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
