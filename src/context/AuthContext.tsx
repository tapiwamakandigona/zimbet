import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ZimBetAccount } from '../lib/supabase'

type AuthContextType = {
    user: User | null
    session: Session | null
    zimBetAccount: ZimBetAccount | null
    loading: boolean
    signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    refreshAccount: () => Promise<void>
    createZimBetAccount: (username: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [zimBetAccount, setZimBetAccount] = useState<ZimBetAccount | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchZimBetAccount(session.user.id)
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchZimBetAccount(session.user.id)
            } else {
                setZimBetAccount(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchZimBetAccount = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('zimbet_accounts')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching ZimBet account:', error)
            }
            setZimBetAccount(data || null)
        } catch (err) {
            console.error('Unexpected error:', err)
        } finally {
            setLoading(false)
        }
    }

    const signIn = async (email: string, password: string, _rememberMe: boolean = true) => {
        // Supabase persists session by default in localStorage
        // rememberMe is handled by localStorage in Login component
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error as Error | null }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setZimBetAccount(null)
    }

    const refreshAccount = async () => {
        if (user) {
            await fetchZimBetAccount(user.id)
        }
    }

    const createZimBetAccount = async (username: string) => {
        if (!user) return { error: new Error('Not logged in') }

        // Add zm- prefix to avoid conflicts with ZimPay usernames
        const prefixedUsername = `zm-${username.toLowerCase().replace(/^zm-/, '')}`

        const newAccount = {
            user_id: user.id,
            username: prefixedUsername,
            balance: 100, // Starting bonus for testing
            total_wins: 0,
            total_losses: 0,
            total_earnings: 0
        }

        const { error } = await supabase
            .from('zimbet_accounts')
            .insert(newAccount)

        if (!error) {
            // IMMEDIATE OPTIMISTIC UPDATE
            // This prevents the "redirect back to setup" loop
            setZimBetAccount(newAccount as any)

            // Then fetch properly to be sure
            await fetchZimBetAccount(user.id)
        } else {
            // Handle "already exists" case gracefully
            // If it exists, we just fetch it and proceed as success
            if (error.code === '23505') { // Unique violation
                await fetchZimBetAccount(user.id)
                return { error: null }
            }
        }

        return { error: error as Error | null }
    }

    return (
        <AuthContext.Provider value={{
            user,
            session,
            zimBetAccount,
            loading,
            signIn,
            signOut,
            refreshAccount,
            createZimBetAccount
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
