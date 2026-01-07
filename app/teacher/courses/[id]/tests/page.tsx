"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { testApi, type Test } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, FileText } from "lucide-react"
import Link from "next/link"

export default function CourseTestsPage() {
  return (
    <ProtectedRoute allowedRole="teacher">
      <CourseTests />
    </ProtectedRoute>
  )
}

function CourseTests() {
  const params = useParams()
  const { toast } = useToast()
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    try {
      const response = await testApi.getForCourse(params.id as string)
      setTests(response.data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tests",
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

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Course Tests</h1>
            <p className="text-muted-foreground">Create and manage tests for this course</p>
          </div>
          <Button asChild>
            <Link href={`/teacher/courses/${params.id}/tests/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading tests...</p>
          </div>
        ) : tests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tests yet</h3>
              <p className="text-muted-foreground mb-4">Create your first test for this course</p>
              <Button asChild>
                <Link href={`/teacher/courses/${params.id}/tests/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{test.title}</CardTitle>
                      <CardDescription>
                        {test.question_count} questions • Created {new Date(test.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/teacher/tests/${test.id}/submissions`}>View Submissions</Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
