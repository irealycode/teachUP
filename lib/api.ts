import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

export interface User {
  id: string
  email: string
  name: string
  role: "teacher" | "student"
}

export interface Course {
  id: string
  title: string
  description: string
  is_public: boolean
  teacher_id: string
  teacher_email: string
  created_at: string
  students?: string[]
  materials?: Material[]
}

export interface Test {
  id: string
  course_id: string
  title: string
  questions?: Question[]
  question_count?: number
  created_at: string
}

export interface Question {
  question: string
  options: string[]
  correct_answer?: number
}

export interface Submission {
  id: string
  test_id: string
  student_id?: string
  student_name?: string
  student_email?: string
  answers?: number[]
  score: number
  submitted_at: string
}

export interface Material {
  id: string
  title: string
  file_type: "video" | "document"
  file_url: string
  uploaded_at: string
}

// Auth API
export const authApi = {
  register: (email: string, password: string, name: string, role: "teacher" | "student") =>
    api.post("/api/auth/register", { email, password, name, role }),

  login: (email: string, password: string) => api.post("/api/auth/login", { email, password }),

  getMe: () => api.get("/api/auth/me"),
}

// Course API
export const courseApi = {
  create: (title: string, description: string, is_public: boolean) =>
    api.post("/api/courses", { title, description, is_public }),

  getAll: () => api.get<Course[]>("/api/courses"),

  getEnrolled: () => api.get<Course[]>("/api/courses/enrolled"),

  getOne: (id: string) => api.get<Course>(`/api/courses/${id}`),

  update: (id: string, data: { title?: string; description?: string; is_public?: boolean }) =>
    api.put(`/api/courses/${id}`, data),

  delete: (id: string) => api.delete(`/api/courses/${id}`),

  invite: (courseId: string, studentEmail: string) =>
    api.post(`/api/courses/${courseId}/invite`, { student_email: studentEmail }),

  getStudents: (courseId: string) => api.get(`/api/courses/${courseId}/students`),

  enroll: (courseId: string) => api.post(`/api/courses/${courseId}/enroll`),

  uploadMaterial: (courseId: string, title: string, fileType: "video" | "document", file: File) => {
    const formData = new FormData()
    formData.append("title", title)
    formData.append("file_type", fileType)
    formData.append("file", file)

    return api.post(`/api/courses/${courseId}/materials`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },

  getMaterials: (courseId: string) => api.get<Material[]>(`/api/courses/${courseId}/materials`),

  deleteMaterial: (courseId: string, materialId: string) =>
    api.delete(`/api/courses/${courseId}/materials/${materialId}`),
}

// Material API
export const materialApi = {
  uploadMaterial: (courseId: string, title: string, fileType: "video" | "document", file: File) => {
    const formData = new FormData()
    formData.append("title", title)
    formData.append("file_type", fileType)
    formData.append("file", file)

    return api.post(`/api/courses/${courseId}/materials`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },

  getMaterials: (courseId: string) => api.get<Material[]>(`/api/courses/${courseId}/materials`),

  deleteMaterial: (courseId: string, materialId: string) =>
    api.delete(`/api/courses/${courseId}/materials/${materialId}`),
}

// Test API
export const testApi = {
  create: (courseId: string, title: string, questions: Question[]) =>
    api.post("/api/tests", { course_id: courseId, title, questions }),

  getForCourse: (courseId: string) => api.get<Test[]>(`/api/courses/${courseId}/tests`),

  getTest: (courseId: string,testId: string) => api.get<Test>(`/api/courses/${courseId}/tests/${testId}`),

  submit: (testId: string, answers: number[]) => api.post("/api/tests/submit", { test_id: testId, answers }),

  getSubmissions: (testId: string) => api.get(`/api/tests/${testId}/submissions`),
}
