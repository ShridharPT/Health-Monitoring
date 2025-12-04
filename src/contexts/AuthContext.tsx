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
    // First try to get from Supabase staff table
    try {
      const { data: staffData, error } = await supabase
        .from('staff')
        .select('*')
        .eq('email', email)
        .single();
      
      if (!error && staffData) {
        // For Supabase, we'd need to verify password on server
        // For now, just check if staff exists
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
        
        const authToken = `token-${Date.now()}`;
        setToken(authToken);
        setUser(staff);
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('auth_user', JSON.stringify(staff));
        return;
      }
    } catch {
      console.log('Staff table not available, using local storage');
    }
    
    // Fall back to local storage staff with password verification
    const authenticatedStaff = store.authenticateStaff(email, password);
    if (authenticatedStaff) {
      const authToken = `token-${Date.now()}`;
      setToken(authToken);
      // Don't include password_hash in the stored user
      const { password_hash, ...safeStaff } = authenticatedStaff;
      setUser(safeStaff as Staff);
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(safeStaff));
      return;
    }
    
    // Check if email exists but password is wrong
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
