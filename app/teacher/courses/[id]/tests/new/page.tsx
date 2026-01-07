"use client"

import type React from "react"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { testApi, type Question } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function NewTestPage() {
  return (
    <ProtectedRoute allowedRole="teacher">
      <NewTest />
    </ProtectedRoute>
  )
}

function NewTest() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [questions, setQuestions] = useState<Question[]>([
    { question: "", options: ["", "", "", ""], correct_answer: 0 },
  ])
  const [loading, setLoading] = useState(false)

  const addQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correct_answer: 0 }])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions]
    updated[qIndex].options[oIndex] = value
    setQuestions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (questions.some((q) => !q.question || q.options.some((o) => !o))) {
      toast({
        title: "Validation Error",
        description: "Please fill in all questions and options",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      await testApi.create(params.id as string, title, questions)
      toast({
        title: "Test created!",
        description: "Your test has been created successfully.",
      })
      router.push(`/teacher/courses/${params.id}/tests`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create test",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href={`/teacher/courses/${params.id}/tests`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create New Test</CardTitle>
            <CardDescription>Add questions and answers for your test</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Test Title</Label>
                <Input
                  id="title"
                  placeholder="End of Course Test"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Questions</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                {questions.map((question, qIndex) => (
                  <Card key={qIndex}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                        {questions.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Input
                          placeholder="What is the capital of France?"
                          value={question.question}
                          onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Options</Label>
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={question.correct_answer === oIndex}
                              onChange={() => updateQuestion(qIndex, "correct_answer", oIndex)}
                              className="accent-primary"
                            />
                            <Input
                              placeholder={`Option ${oIndex + 1}`}
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              required
                            />
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">Select the correct answer</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating..." : "Create Test"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
