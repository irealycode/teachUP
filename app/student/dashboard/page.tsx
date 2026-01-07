"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { courseApi, type Course } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Globe, Lock, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Logo from "@/components/ui/logo"

export default function StudentDashboardPage() {
  return (
    <ProtectedRoute allowedRole="student">
      <StudentDashboard />
    </ProtectedRoute>
  )
}

function StudentDashboard() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const [available, enrolled] = await Promise.all([courseApi.getAll(), courseApi.getEnrolled()])
      setAvailableCourses(available.data)
      setEnrolledCourses(enrolled.data)
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

  const handleEnroll = async (courseId: string) => {
    try {
      await courseApi.enroll(courseId)
      toast({
        title: "Enrolled!",
        description: "You have successfully enrolled in this course.",
      })
      loadCourses()
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error.response?.data?.detail || "Failed to enroll in course",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const isEnrolled = (courseId: string) => {
    return enrolledCourses.some((c) => c.id === courseId)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="font-medium">{user?.name}</p>
              <p className="text-muted-foreground">Student</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Learning</h1>
          <p className="text-muted-foreground">Discover courses and track your progress</p>
        </div>

        <Tabs defaultValue="enrolled" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="enrolled">My Courses</TabsTrigger>
            <TabsTrigger value="available">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="enrolled" className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading courses...</p>
              </div>
            ) : enrolledCourses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No enrolled courses</h3>
                  <p className="text-muted-foreground mb-4">Browse available courses to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => (
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
                      <Button asChild className="w-full">
                        <Link href={`/student/courses/${course.id}`}>View Course</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="available" className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading courses...</p>
              </div>
            ) : availableCourses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No courses available</h3>
                  <p className="text-muted-foreground">Check back later for new courses</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map((course) => (
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
                      {isEnrolled(course.id) ? (
                        <Button asChild variant="outline" className="w-full bg-transparent">
                          <Link href={`/student/courses/${course.id}`}>View Course</Link>
                        </Button>
                      ) : (
                        <Button onClick={() => handleEnroll(course.id)} className="w-full">
                          Enroll Now
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
