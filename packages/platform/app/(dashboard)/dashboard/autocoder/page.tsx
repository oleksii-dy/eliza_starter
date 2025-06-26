'use client'

import { useState, useEffect } from 'react'
import { AutocoderWorkspace } from '@/components/autocoder/AutocoderWorkspace'
import { useAuth } from '@/lib/auth/useAuth'
import { Spinner } from '@/components/ui/spinner'

export default function AutocoderPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner variant="light" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600">
            Please log in to access the Autocoder.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Autocoder</h1>
        <p className="text-gray-600 mt-1">
          Collaborate with AI to build, test, and deploy plugins automatically
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <AutocoderWorkspace userId={user.id} />
      </div>
    </div>
  )
}