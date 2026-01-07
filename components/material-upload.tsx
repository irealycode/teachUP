"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { materialApi } from "@/lib/api"
import { Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MaterialUploadProps {
  courseId: string
  onUploadSuccess: () => void
}

export function MaterialUpload({ courseId, onUploadSuccess }: MaterialUploadProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [fileType, setFileType] = useState<"video" | "document">("video")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!title || !file) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)
      await materialApi.uploadMaterial(courseId, title, fileType, file)
      toast({
        title: "Success",
        description: "Material uploaded successfully",
      })
      setTitle("")
      setFile(null)
      setFileType("video")
      setOpen(false)
      onUploadSuccess()
    } catch (error: any) {
        console.log(error.response?.data?.detail)
      toast({
        title: "Upload failed",
        description: "Failed to upload material",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload Material
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Course Material</DialogTitle>
          <DialogDescription>Add a video or document to your course</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Material Title</Label>
            <Input
              id="title"
              placeholder="e.g., Introduction to Python"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Material Type</Label>
            <Select value={fileType} onValueChange={(value: any) => setFileType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              accept={fileType === "video" ? "video/*" : "application/pdf,.doc,.docx,.txt"}
              onChange={handleFileChange}
            />
            {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
          </div>

          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload Material"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
