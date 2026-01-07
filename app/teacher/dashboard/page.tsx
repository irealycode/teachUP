"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { courseApi, type Course } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Plus, BookOpen, Lock, Globe, Users, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Logo from "@/components/ui/logo"

export default function TeacherDashboardPage() {
  return (
    <ProtectedRoute allowedRole="teacher">
      <TeacherDashboard />
    </ProtectedRoute>
  )
}

function TeacherDashboard() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await courseApi.getAll()
      setCourses(response.data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background font-[Nunito]">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo  />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="font-medium">{user?.name}</p>
              <p className="text-muted-foreground">Teacher</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Courses</h1>
            <p className="text-muted-foreground">Manage your courses and track student progress</p>
          </div>
          <Button asChild>
            <Link href="/teacher/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">Create your first course to get started</p>
              <Button asChild>
                <Link href="/teacher/courses/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{course.title}</CardTitle>
                    {course.is_public ? (
                      <Globe className="h-5 w-5 text-accent" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Users className="h-4 w-4" />
                    <span>{course.is_public ? "Public course" : "Private course"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1 bg-transparent">
                      <Link href={`/teacher/courses/${course.id}`}>Manage</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="flex-1 bg-transparent">
                      <Link href={`/teacher/courses/${course.id}/tests`}>Tests</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
