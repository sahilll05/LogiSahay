'use client'

import React, { createContext, useContext } from 'react'

interface AuthContextType {
  user: any | null
  session: any | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: { id: 'dummy-user-id', email: 'user@logisahay.com' },
  session: { access_token: 'dummy-token' },
  loading: false,
  signOut: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthContext.Provider value={{
      user: { id: 'dummy-user-id', email: 'user@logisahay.com' },
      session: { access_token: 'dummy-token' },
      loading: false,
      signOut: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
