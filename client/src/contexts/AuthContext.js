"use client"

import { createContext, useState, useContext, useEffect, useCallback } from "react"
import { supabase, normalizeSupabaseUser } from "../supabaseClient"

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completedAssessments, setCompletedAssessments] = useState(new Set())
  const [authError, setAuthError] = useState(null)
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || ''

  const loadAssessmentStatus = useCallback(async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/quiz/history/${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.levelAssessmentDone) {
          setCompletedAssessments(new Set([userId]))
          console.log('✅ User has completed assessment (loaded from Supabase backend)')
        }
      }
    } catch (error) {
      console.error('❌ Error loading assessment status:', error)
      const saved = JSON.parse(localStorage.getItem('completedAssessments') || '[]')
      setCompletedAssessments(new Set(saved))
    }
  }, [API_BASE_URL])

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const user = data?.session?.user ? normalizeSupabaseUser(data.session.user) : null
        setCurrentUser(user)
        if (user) {
          await loadAssessmentStatus(user.uid)
        } else {
          const saved = JSON.parse(localStorage.getItem('completedAssessments') || '[]')
          setCompletedAssessments(new Set(saved))
        }
      } catch (error) {
        console.error('Auth init error:', error)
        setAuthError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const supabaseUser = session?.user ? normalizeSupabaseUser(session.user) : null
      setCurrentUser(supabaseUser)
      if (supabaseUser) {
        await loadAssessmentStatus(supabaseUser.uid)
      } else {
        const saved = JSON.parse(localStorage.getItem('completedAssessments') || '[]')
        setCompletedAssessments(new Set(saved))
      }
      setLoading(false)
      setAuthError(null)
    })

    return () => authListener?.subscription?.unsubscribe()
  }, [loadAssessmentStatus])

  const hasCompletedAssessment = () => {
    if (!currentUser) return false
    return completedAssessments.has(currentUser.uid)
  }

  const markAssessmentCompleted = async () => {
    if (!currentUser) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/quiz/history/${currentUser.uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizData: {
            score: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            quizType: 'levelAssessment',
            details: []
          },
          isLevelAssessment: true
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save assessment: ${response.statusText}`)
      }

      setCompletedAssessments(prev => new Set([...prev, currentUser.uid]))

      const saved = JSON.parse(localStorage.getItem('completedAssessments') || '[]')
      if (!saved.includes(currentUser.uid)) {
        saved.push(currentUser.uid)
        localStorage.setItem('completedAssessments', JSON.stringify(saved))
      }

      console.log('✅ Assessment completion status saved to Supabase backend')
    } catch (error) {
      console.error('❌ Error saving assessment status:', error)
      setCompletedAssessments(prev => new Set([...prev, currentUser.uid]))
      const saved = JSON.parse(localStorage.getItem('completedAssessments') || '[]')
      if (!saved.includes(currentUser.uid)) {
        saved.push(currentUser.uid)
        localStorage.setItem('completedAssessments', JSON.stringify(saved))
      }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setCurrentUser(null)
      setCompletedAssessments(new Set())
    } catch (error) {
      console.error('Logout error:', error)
      setAuthError(error.message)
    }
  }

  const value = {
    currentUser,
    loading,
    authError,
    logout,
    hasCompletedAssessment,
    markAssessmentCompleted,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
