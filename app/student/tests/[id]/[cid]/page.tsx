"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { testApi, type Test, type Submission } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function TakeTestPage() {
  return (
    <ProtectedRoute allowedRole="student">
      <TakeTest />
    </ProtectedRoute>
  )
}

function TakeTest() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [test, setTest] = useState<Test | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTest()
    checkSubmission()
  }, [])

  const loadTest = async () => {
    try {
      const response = await testApi.getTest(params.cid as string,params.id as string)
      const foundTest = response.data
      // const foundTest = response.data.find((t: Test) => t.id === params.id)
      if (foundTest) {
        setTest(foundTest)
        setAnswers(new Array(foundTest.questions?.length || 0).fill(-1))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load test",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkSubmission = async () => {
    try {
      const response = await testApi.getSubmissions(params.id as string)
      if (response.data && !Array.isArray(response.data)) {
        setSubmission(response.data)
      }
    } catch (error) {
      console.error("No submission found", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (answers.some((a) => a === -1)) {
      toast({
        title: "Incomplete",
        description: "Please answer all questions before submitting",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await testApi.submit(params.id as string, answers)
      toast({
        title: "Test submitted!",
        description: `Your score: ${response.data.score.toFixed(1)}%`,
      })
      setSubmission(response.data)
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.response?.data?.detail || "Failed to submit test",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading test...</p>
        </div>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Test not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submission) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/student/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>

          <Card className="text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-3xl">Test Completed!</CardTitle>
              <CardDescription>You have already submitted this test</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-5xl font-bold text-primary mb-2">{submission.score.toFixed(1)}%</div>
                  <p className="text-muted-foreground">Your Score</p>
                </div>
                <Button asChild className="w-full">
                  <Link href="/student/dashboard">Return to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/student/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">{test.title}</CardTitle>
            <CardDescription>Answer all questions and submit when ready</CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {test.questions?.map((question, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {index + 1} of {test.questions?.length}
                </CardTitle>
                <CardDescription className="text-base text-foreground mt-2">{question.question}</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[index]?.toString()}
                  onValueChange={(value) => {
                    const newAnswers = [...answers]
                    newAnswers[index] = Number.parseInt(value)
                    setAnswers(newAnswers)
                  }}
                >
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                      <RadioGroupItem value={optionIndex.toString()} id={`q${index}-o${optionIndex}`} />
                      <Label htmlFor={`q${index}-o${optionIndex}`} className="flex-1 cursor-pointer font-normal">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="pt-6">
              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? "Submitting..." : "Submit Test"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
