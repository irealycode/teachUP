"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authApi, type User } from "./api"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, role: "teacher" | "student") => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")

    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    const { token, user } = response.data

    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))
    setUser(user)
  }

  const register = async (email: string, password: string, name: string, role: "teacher" | "student") => {
    const response = await authApi.register(email, password, name, role)
    const { token, user } = response.data

    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
