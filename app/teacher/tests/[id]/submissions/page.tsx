"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { testApi, type Submission } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Users } from "lucide-react"
import Link from "next/link"

export default function TestSubmissionsPage() {
  return (
    <ProtectedRoute allowedRole="teacher">
      <TestSubmissions />
    </ProtectedRoute>
  )
}

function TestSubmissions() {
  const params = useParams()
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    try {
      const response = await testApi.getSubmissions(params.id as string)
      setSubmissions(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load submissions",
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
          <Link href="/teacher/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Test Submissions</h1>
          <p className="text-muted-foreground">View student results and scores</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
              <p className="text-muted-foreground">Students haven't taken this test yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{submission.student_name}</CardTitle>
                      <CardDescription>
                        {submission.student_email} • Submitted {new Date(submission.submitted_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{submission.score.toFixed(1)}%</div>
                      <p className="text-sm text-muted-foreground">Score</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{submissions.length}</div>
                    <p className="text-sm text-muted-foreground">Submissions</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{Math.max(...submissions.map((s) => s.score)).toFixed(1)}%</div>
                    <p className="text-sm text-muted-foreground">Highest Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
