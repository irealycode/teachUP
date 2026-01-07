"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { courseApi, type Course, type User } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Mail, Trash2, Users } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { MaterialUpload } from "@/components/material-upload"
import { CourseMaterials } from "@/components/course-materials"

export default function ManageCoursePage() {
  return (
    <ProtectedRoute allowedRole="teacher">
      <ManageCourse />
    </ProtectedRoute>
  )
}

function ManageCourse() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [course, setCourse] = useState<Course | null>(null)
  const [students, setStudents] = useState<User[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [studentEmail, setStudentEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [materialsRefresh, setMaterialsRefresh] = useState(0)

  useEffect(() => {
    loadCourse()
    loadStudents()
  }, [])

  const loadCourse = async () => {
    try {
      const response = await courseApi.getOne(params.id as string)
      setCourse(response.data)
      setTitle(response.data.title)
      setDescription(response.data.description)
      setIsPublic(response.data.is_public)
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

  const loadStudents = async () => {
    try {
      const response = await courseApi.getStudents(params.id as string)
      setStudents(response.data)
    } catch (error) {
      console.error("Failed to load students", error)
    }
  }

  const handleUpdate = async () => {
    try {
      await courseApi.update(params.id as string, { title, description, is_public: isPublic })
      toast({
        title: "Course updated!",
        description: "Your changes have been saved.",
      })
      loadCourse()
    } catch (error: any) {
      console.log(error.response?.data?.detail)
      // toast({
      //   title: "Error",
      //   description: error.response?.data?.detail || "Failed to update course",
      //   variant: "destructive",
      // })
    }
  }

  const handleInvite = async () => {
    try {
      await courseApi.invite(params.id as string, studentEmail)
      toast({
        title: "Invitation sent!",
        description: `${studentEmail} can now access this course.`,
      })
      setStudentEmail("")
      setInviteOpen(false)
    } catch (error: any) {
      console.log(error.response?.data?.detail)
      // toast({
      //   title: "Error",
      //   description: error.response?.data?.detail || "Failed to invite student",
      //   variant: "destructive",
      // })
    }
  }

  const handleDelete = async () => {
    try {
      await courseApi.delete(params.id as string)
      toast({
        title: "Course deleted",
        description: "The course has been permanently deleted.",
      })
      router.push("/teacher/dashboard")
    } catch (error: any) {
      console.log(error.response?.data?.detail)

      // toast({
      //   title: "Error",
      //   description: error.response?.data?.detail || "Failed to delete course",
      //   variant: "destructive",
      // })
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
          <Link href="/teacher/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Materials</CardTitle>
                  <CardDescription>Upload videos and documents for your students</CardDescription>
                </div>
                <MaterialUpload
                  courseId={params.id as string}
                  onUploadSuccess={() => setMaterialsRefresh((prev) => prev + 1)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <CourseMaterials
                courseId={params.id as string}
                isTeacher={true}
                onMaterialDeleted={() => setMaterialsRefresh((prev) => prev + 1)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>Update your course information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Public Course</Label>
                  <p className="text-sm text-muted-foreground">Allow anyone to discover and enroll</p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <Button onClick={handleUpdate}>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enrolled Students</CardTitle>
                  <CardDescription>Manage course enrollments and invitations</CardDescription>
                </div>
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Invite Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Student</DialogTitle>
                      <DialogDescription>Enter the student's email to invite them to this course</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="student-email">Student Email</Label>
                        <Input
                          id="student-email"
                          type="email"
                          placeholder="student@example.com"
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleInvite} className="w-full">
                        Send Invitation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No students enrolled yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Permanently delete this course and all related data</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Course
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the course, all tests, and student
                      submissions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
