"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { courseApi, testApi, type Course, type Test } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, FileText, Globe, Lock } from "lucide-react"
import Link from "next/link"
import { CourseMaterials } from "@/components/course-materials"

export default function StudentCoursePage() {
  return (
    <ProtectedRoute allowedRole="student">
      <StudentCourse />
    </ProtectedRoute>
  )
}

function StudentCourse() {
  const params = useParams()
  const { toast } = useToast()
  const [course, setCourse] = useState<Course | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourse()
    loadTests()
  }, [])

  const loadCourse = async () => {
    try {
      const response = await courseApi.getOne(params.id as string)
      setCourse(response.data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load course",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTests = async () => {
    try {
      const response = await testApi.getForCourse(params.id as string)
      setTests(response.data)
    } catch (error) {
      console.error("Failed to load tests", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Course not found</p>
          </CardContent>
        </Card>
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
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
                <CardDescription className="text-base">{course.description}</CardDescription>
              </div>
              {course.is_public ? (
                <Globe className="h-6 w-6 text-accent ml-4" />
              ) : (
                <Lock className="h-6 w-6 text-muted-foreground ml-4" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Instructor: {course.teacher_email}</p>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Course Materials</h2>
          <CourseMaterials courseId={params.id as string} isTeacher={false} />
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Course Tests</h2>
          {tests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests available</h3>
                <p className="text-muted-foreground">The instructor hasn't created any tests yet</p>
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
                        <CardDescription>{test.question_count} questions</CardDescription>
                      </div>
                      <Button asChild>
                        <Link href={`/student/tests/${test.id}/${params.id}`}>Take Test</Link>
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
