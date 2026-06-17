"use client"

import { createContext, useState, useContext, useEffect } from "react"
import { auth, firestore } from "../firebase/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completedAssessments, setCompletedAssessments] = useState(new Set()) // เก็บ UID ที่ทำ Assessment แล้ว
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        // โหลดข้อมูลจาก Firestore เมื่อ user login
        await loadAssessmentStatus(user.uid)
      } else {
        setCompletedAssessments(new Set())
      }
      setLoading(false)
      setAuthError(null) // Clear auth error on successful auth state change
    }, (error) => {
      console.error('Auth state change error:', error)
      setAuthError(error.message)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // โหลดสถานะการทำ Assessment จาก Firestore
  const loadAssessmentStatus = async (userId) => {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        if (userData.hasCompletedAssessment) {
          setCompletedAssessments(new Set([userId]))
          console.log('✅ User has completed assessment (loaded from Firestore)')
        }
      }
    } catch (error) {
      console.error('❌ Error loading assessment status:', error)
      // Fallback to localStorage
      const saved = JSON.parse(localStorage.getItem('completedAssessments') || '[]')
      setCompletedAssessments(new Set(saved))
    }
  }

  // ฟังก์ชันเช็คว่า User ทำ Assessment Quiz แล้วหรือยัง
  const hasCompletedAssessment = () => {
    if (!currentUser) return false
    return completedAssessments.has(currentUser.uid)
  }

  // ฟังก์ชันบันทึกว่า User ทำ Assessment Quiz แล้ว
  const markAssessmentCompleted = async () => {
    if (!currentUser) return
    
    try {
      // บันทึกลง Firestore
      const userRef = doc(firestore, 'users', currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userRef, {
          hasCompletedAssessment: true,
          assessmentCompletedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        })
      } else {
        // Create new document
        await setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          hasCompletedAssessment: true,
          assessmentCompletedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        })
      }
      
      // Update local state
      setCompletedAssessments(prev => new Set([...prev, currentUser.uid]))
      
      // บันทึกลง localStorage เป็น backup
      const saved = JSON.parse(localStorage.getItem('completedAssessments') || '[]')
      if (!saved.includes(currentUser.uid)) {
        saved.push(currentUser.uid)
        localStorage.setItem('completedAssessments', JSON.stringify(saved))
      }
      
      console.log('✅ Assessment completion status saved to Firestore')
    } catch (error) {
      console.error('❌ Error saving assessment status to Firestore:', error)
      
      // Fallback to localStorage only
      setCompletedAssessments(prev => new Set([...prev, currentUser.uid]))
      const saved = JSON.parse(localStorage.getItem('completedAssessments') || '[]')
      if (!saved.includes(currentUser.uid)) {
        saved.push(currentUser.uid)
        localStorage.setItem('completedAssessments', JSON.stringify(saved))
      }
    }
  }

  // โหลดข้อมูลจาก localStorage ตอน init (removed - now using Firestore)

  const logout = () => {
    signOut(auth).catch(error => {
      console.error('Logout error:', error)
      setAuthError(error.message)
    })
    setCurrentUser(null)
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
