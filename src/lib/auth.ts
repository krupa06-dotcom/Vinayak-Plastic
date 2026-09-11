import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

// ============================================================
// Types
// ============================================================

export interface AuthUser extends User {
  // Extended user type for admin-specific data
  is_admin?: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
}

// ============================================================
// Auth Helper Functions (for future admin panel)
// ============================================================

/**
 * Get the current user session
 * Use this in admin pages to check authentication status
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return session;
}

/**
 * Get the current user
 * Use this in admin pages to get user information
 */
export async function getUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }

  return user;
}

/**
 * Sign in with email and password
 * Use this for admin login
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Error signing in:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Sign out
 * Use this for admin logout
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if the current user is an admin
 * This is a client-side check - actual authorization is handled by RLS
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getUser();
  
  if (!user) {
    return false;
  }

  // Check if user email ends with admin domain
  // You can customize this logic based on your requirements
  const adminDomains = ['@vinayakplastics.com'];
  const email = user.email || '';
  
  return adminDomains.some(domain => email.endsWith(domain));
}

/**
 * Listen for auth state changes
 * Use this in admin layout to react to login/logout
 */
export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session);
    }
  );

  return () => subscription.unsubscribe();
}

/**
 * Reset password
 * Use this for password reset functionality
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/admin/reset-password`
  });

  if (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update password
 * Use this after password reset
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================
// Admin Auth Guard (for future use in admin pages)
// ============================================================

/**
 * Require authentication for admin pages
 * Redirects to login if not authenticated
 */
export async function requireAuth(redirectTo: string = '/admin/login'): Promise<boolean> {
  const session = await getSession();
  
  if (!session) {
    // In a real implementation, you would redirect to the login page
    // For now, we'll just return false
    console.warn('Authentication required. Redirect to:', redirectTo);
    return false;
  }

  return true;
}

/**
 * Require admin privileges
 * Redirects to unauthorized if not admin
 */
export async function requireAdmin(): Promise<boolean> {
  const authenticated = await requireAuth();
  
  if (!authenticated) {
    return false;
  }

  const admin = await isAdmin();
  
  if (!admin) {
    console.warn('Admin privileges required');
    return false;
  }

  return true;
}
