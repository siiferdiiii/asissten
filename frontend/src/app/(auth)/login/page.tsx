"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Stethoscope, Mail, Lock, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const { accessToken, user, memberships } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('memberships', JSON.stringify(memberships));
      
      // Auto-select first doctor profile membership if available
      const activeMember = memberships[0];
      if (activeMember?.doctorProfileId) {
        localStorage.setItem('activeDoctorProfileId', activeMember.doctorProfileId);
      } else {
        localStorage.removeItem('activeDoctorProfileId');
      }

      // Dispatch auth-login event to let useMembership state reload
      window.dispatchEvent(new Event('auth-login'));

      // Redirect to trips page
      router.push('/trips');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail: string) => {
    setIsLoading(true);
    setError(null);
    setEmail(roleEmail);
    setPassword('Password123');

    try {
      const response = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: roleEmail, password: 'Password123' }),
      });

      const { accessToken, user, memberships } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('memberships', JSON.stringify(memberships));
      
      const activeMember = memberships[0];
      if (activeMember?.doctorProfileId) {
        localStorage.setItem('activeDoctorProfileId', activeMember.doctorProfileId);
      } else {
        localStorage.removeItem('activeDoctorProfileId');
      }

      window.dispatchEvent(new Event('auth-login'));
      router.push('/trips');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const shortcuts = [
    { label: 'Doctor', email: 'doctor@example.com', desc: 'Dr. Andi Sp.PD (View documents, confirm tentative)' },
    { label: 'Owner Assistant', email: 'owner@example.com', desc: 'Sarah (Full CRUD + Activity Log + Team settings)' },
    { label: 'Assistant', email: 'assistant@example.com', desc: 'Rina (Full CRUD except activity log/team)' },
    { label: 'Viewer', email: 'viewer@example.com', desc: 'Budi (Read-only view on all data)' },
  ];

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-[#FAF9F5] text-[#1C2430] font-sans">
      
      {/* Left side: Premium Branding & Visuals */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 bg-linear-to-br from-[#2E5266] to-[#1E3643] text-white overflow-hidden relative min-h-[300px] md:min-h-screen">
        
        {/* Abstract Background Orbs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#C98A3E]/10 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#C98A3E]/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 z-10">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-xs">
            <Stethoscope className="h-6 w-6 text-[#C98A3E]" />
          </div>
          <span className="font-semibold text-lg tracking-tight uppercase">Assistant Hub</span>
        </div>

        {/* Feature List */}
        <div className="my-auto py-12 z-10 max-w-lg space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Seamless Coordination <br />for Specialized Doctors.
          </h1>
          <p className="text-white/70 text-base md:text-lg">
            Manage clinic schedules, surgeries, travel booking documents, and administrative checklists from a single source of truth.
          </p>
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-[#C98A3E] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-white/90">Role-Based Access Control</p>
                <p className="text-xs text-white/60">Strict authorization mapping for Doctor, Main Assistant, Staff & Viewers.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCheck className="h-5 w-5 text-[#C98A3E] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-white/90">Real-Time Syncing</p>
                <p className="text-xs text-white/60">Socket.io connection automatically syncs trip and scheduling statuses.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="z-10 text-xs text-white/40">
          © 2026 Assistant Hub. All rights reserved.
        </div>
      </div>

      {/* Right side: Login Card and Quick Dev Short-cuts */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto bg-[#FAF9F5]">
        <div className="w-full max-w-[460px] space-y-6">
          
          <Card className="border border-black/5 shadow-xl bg-white backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="space-y-1 pb-6 pt-8 px-8">
              <CardTitle className="text-2xl font-bold tracking-tight text-[#1C2430]">Sign In</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Enter your email and password to access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleLogin} className="space-y-4">
                
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 flex items-start gap-2.5 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-[#1C2430]/70 uppercase tracking-wider">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="doctor@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9 h-11 border-black/10 focus:border-[#2E5266] focus:ring-1 focus:ring-[#2E5266] rounded-lg transition-colors"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-xs font-semibold text-[#1C2430]/70 uppercase tracking-wider">Password</Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-9 h-11 border-black/10 focus:border-[#2E5266] focus:ring-1 focus:ring-[#2E5266] rounded-lg transition-colors"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-11 bg-[#2E5266] hover:bg-[#1E3643] text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Dev Login shortcuts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Developer Shortcuts</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut.label}
                  onClick={() => handleQuickLogin(shortcut.email)}
                  disabled={isLoading}
                  className="flex flex-col text-left p-3 rounded-xl border border-black/5 hover:border-[#C98A3E] bg-white hover:bg-[#FAF9F5] shadow-xs transition-all duration-200 group cursor-pointer disabled:opacity-50"
                >
                  <span className="font-semibold text-xs text-[#2E5266] group-hover:text-[#C98A3E] flex items-center gap-1.5">
                    {shortcut.label}
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {shortcut.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
