import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types/max';

/**
 * User Context for managing authenticated user state
 * Provides user data and authentication status throughout the app
 */

interface UserContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    token: string | null;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Default user with safe fallback values
const DEFAULT_USER: User = {
    id: 0,
    max_user_id: 0,
    first_name: '',
    last_name: '',
    username: '',
    language_code: 'ru',
    photo_url: '',
    phone: '',
};

interface UserProviderProps {
    children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Initialize authentication on mount
    useEffect(() => {
        // First try to restore existing token from localStorage
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user_data');

        if (storedToken && storedUser) {
            console.log('🔄 Restoring authentication from localStorage');
            try {
                const userData = JSON.parse(storedUser);
                setUser(userData);
                setToken(storedToken);
                setIsAuthenticated(true);
                setIsLoading(false); // Mark as loaded when restoring from cache
                console.log('✅ User data restored from localStorage');
            } catch (error) {
                console.error('❌ Failed to parse user data from localStorage:', error);
                // If restoration fails, continue with normal auth flow
                initializeAuth();
            }
        } else {
            // No cached data, proceed with normal authentication
            initializeAuth();
        }
    }, []);

    /**
     * Initialize authentication with MAX
     * Attempts to authenticate via backend, falls back to guest mode on failure
     */
    async function initializeAuth() {
        try {
            // Signal MAX that app is ready
            if (window.WebApp) {
                window.WebApp.ready();
            }

            // Get initData from MAX WebApp
            const initData = window.WebApp?.initData || '';

            // If no initData, work in guest mode with defaults
            if (!initData) {
                console.warn('No MAX initData available - running in guest mode');
                setUser(DEFAULT_USER);
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }

            // Authenticate with backend
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/auth/max`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ initData }),
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const data: AuthResponse = await response.json();

            if (data.authenticated && data.user && data.token) {
                // Successfully authenticated
                setUser(data.user);
                setToken(data.token);
                setIsAuthenticated(true);

                // Store token and user data in localStorage for persistence
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_data', JSON.stringify(data.user));

                console.log('✅ User authenticated successfully');
            } else {
                // Authentication failed, use guest mode
                console.warn('Authentication failed - running in guest mode');
                setUser(DEFAULT_USER);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Error during authentication:', error);
            // On any error, fall back to guest mode with defaults
            setUser(DEFAULT_USER);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Logout user and clear authentication state
     */
    function logout() {
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
    }

    const value: UserContextType = {
        user,
        isAuthenticated,
        isLoading,
        token,
        setUser,
        setToken,
        logout,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * Hook to use user context
 * Throws error if used outside UserProvider
 */
export function useUser(): UserContextType {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}