"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { materialApi, type Material } from "@/lib/api"
import { FileText, Film, Trash2, Download } from "lucide-react"
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

interface CourseMaterialsProps {
  courseId: string
  isTeacher?: boolean
  onMaterialDeleted?: () => void
}

export function CourseMaterials({ courseId, isTeacher = false, onMaterialDeleted }: CourseMaterialsProps) {
  const { toast } = useToast()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMaterials()
  }, [courseId])

  const loadMaterials = async () => {
    try {
      const response = await materialApi.getMaterials(courseId)
      setMaterials(response.data)
    } catch (error) {
      console.error("Failed to load materials", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (materialId: string) => {
    try {
      await materialApi.deleteMaterial(courseId, materialId)
      toast({
        title: "Material deleted",
        description: "The material has been removed from the course",
      })
      loadMaterials()
      onMaterialDeleted?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete material",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    )
  }

  // Separate videos and documents
  const videos = materials.filter((m) => m.file_type === "video")
  const documents = materials.filter((m) => m.file_type === "document")

  return (
    <div className="space-y-6">
      {/* Videos Section */}
      {videos.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Course Videos
          </h3>
          <div className="space-y-3">
            {videos.map((material) => (
              <Card key={material.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Film className="h-5 w-5 text-primary mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-base">{material.title}</CardTitle>
                        <CardDescription>
                          Uploaded {new Date(material.uploaded_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    {isTeacher && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Material?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The material will be removed from the course.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(material.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg overflow-hidden">
                    <video src={material.file_url} controls className="w-full max-h-96" controlsList="nodownload" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Documents Section */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Course Documents
          </h3>
          <div className="space-y-3">
            {documents.map((material) => (
              <Card key={material.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 text-accent mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-base">{material.title}</CardTitle>
                        <CardDescription>
                          Uploaded {new Date(material.uploaded_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    {isTeacher ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Material?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The material will be removed from the course.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(material.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button variant="outline" size="sm" asChild>
                        <a href={material.file_url} download>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {videos.length === 0 && documents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No materials yet</h3>
            <p className="text-muted-foreground">
              {isTeacher
                ? "Upload videos and documents to get started"
                : "The instructor hasn't added any materials yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
