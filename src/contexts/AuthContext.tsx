import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as store from '@/lib/localStore';
import type { Staff } from '@/types/hospital';

interface AuthContextType {
  user: Staff | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Staff | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize default admin on first load
    store.initializeDefaultAdmin();
    
    // Check for stored token on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Refresh user data from staff records to ensure ID matches
      const freshStaff = store.getStaffByEmail(parsedUser.email);
      if (freshStaff) {
        const { password_hash, ...safeStaff } = freshStaff;
        setUser(safeStaff as Staff);
        localStorage.setItem('auth_user', JSON.stringify(safeStaff));
      } else {
        setUser(parsedUser);
      }
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = store.hashPassword(password);
    
    // Try to authenticate from Supabase staff table
    try {
      const { data: staffData, error } = await supabase
        .from('staff')
        .select('*')
        .ilike('email', normalizedEmail)
        .single();
      
      if (!error && staffData) {
        // Verify password hash - must match exactly
        if (!staffData.password_hash || staffData.password_hash !== passwordHash) {
          throw new Error('Invalid password. Please try again.');
        }
        
        const staff: Staff = {
          id: staffData.id,
          name: staffData.name,
          email: staffData.email,
          role: staffData.role as Staff['role'],
          contact: staffData.contact,
          department: staffData.department,
          specialization: staffData.specialization,
          on_duty: staffData.on_duty,
          avatar_url: staffData.avatar_url,
          created_at: staffData.created_at,
          updated_at: staffData.updated_at
        };
        
        const authToken = `token-${Date.now()}-${staffData.id}`;
        setToken(authToken);
        setUser(staff);
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('auth_user', JSON.stringify(staff));
        console.log('Login successful via Supabase for:', staff.email);
        return;
      }
      
      if (error && error.code === 'PGRST116') {
        // No user found in Supabase
        throw new Error('Account not found. Please contact admin to create your account.');
      }
      
      if (error) {
        console.log('Supabase error:', error);
        throw new Error('Database error. Please try again.');
      }
    } catch (e: any) {
      // Re-throw auth errors
      if (e.message.includes('Invalid password') || 
          e.message.includes('Account not found') ||
          e.message.includes('Database error')) {
        throw e;
      }
      console.log('Supabase connection failed, falling back to localStorage:', e.message);
    }
    
    // Fall back to local storage only if Supabase is unavailable
    const authenticatedStaff = store.authenticateStaff(email, password);
    if (authenticatedStaff) {
      const authToken = `token-${Date.now()}-local`;
      setToken(authToken);
      const { password_hash, ...safeStaff } = authenticatedStaff;
      setUser(safeStaff as Staff);
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(safeStaff));
      console.log('Login successful via localStorage for:', safeStaff.email);
      return;
    }
    
    const staffExists = store.getStaffByEmail(email);
    if (staffExists) {
      throw new Error('Invalid password. Please try again.');
    }
    
    throw new Error('Account not found. Please contact admin to create your account.');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      isAuthenticated: !!token && !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
