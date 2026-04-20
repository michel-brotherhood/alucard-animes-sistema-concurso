import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isJuror, setIsJuror] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Check roles with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkRoles(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsJuror(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkRoles(userId: string) {
    try {
      const [adminRes, jurorRes] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'juror' as any }),
      ]);
      if (adminRes.error) throw adminRes.error;
      setIsAdmin(!!adminRes.data);
      setIsJuror(!!jurorRes.data);
    } catch (error) {
      console.error('Erro ao verificar roles:', error);
      setIsAdmin(false);
      setIsJuror(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  async function signOut() {
    // Limpa estado local imediatamente para evitar race com redirects
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsJuror(false);
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  return {
    user,
    session,
    loading,
    isAdmin,
    isJuror,
    signIn,
    signOut,
  };
}
