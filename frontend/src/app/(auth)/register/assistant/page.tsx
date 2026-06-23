"use client"

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Stethoscope,
  Mail,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  XCircle,
} from 'lucide-react';

interface InviteInfo {
  doctorProfileId: string;
  specialization: string;
  doctorName: string;
}

// Inner component that reads searchParams (must be wrapped in Suspense)
function AssistantRegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [inviteError, setInviteError] = useState<string>('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setInviteStatus('invalid');
      setInviteError('URL tidak mengandung token undangan yang valid.');
      return;
    }

    apiFetch<any>(`/auth/invite-info?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setInviteInfo(res.data as InviteInfo);
        setInviteStatus('valid');
      })
      .catch((err: any) => {
        setInviteStatus('invalid');
        setInviteError(err.message || 'Link undangan tidak valid atau sudah kadaluarsa.');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (form.password !== form.confirmPassword) {
      setFormError('Password tidak cocok.');
      return;
    }
    if (form.password.length < 8) {
      setFormError('Password minimal 8 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch<any>('/auth/register-assistant', {
        method: 'POST',
        body: JSON.stringify({
          inviteToken: token,
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const { accessToken, user, memberships } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('memberships', JSON.stringify(memberships));

      const activeMember = memberships[0];
      if (activeMember?.doctorProfileId) {
        localStorage.setItem('activeDoctorProfileId', activeMember.doctorProfileId);
      }

      window.dispatchEvent(new Event('auth-login'));
      router.push('/trips');
    } catch (err: any) {
      setFormError(err.message || 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-[#FAF9F5] text-[#1C2430] font-sans">
      {/* Left branding panel */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 bg-linear-to-br from-[#2E5266] to-[#1E3643] text-white overflow-hidden relative min-h-[280px] md:min-h-screen">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#C98A3E]/10 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#C98A3E]/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

        <div className="flex items-center gap-3 z-10">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-xs">
            <Stethoscope className="h-6 w-6 text-[#C98A3E]" />
          </div>
          <span className="font-semibold text-lg tracking-tight uppercase">Assistant Hub</span>
        </div>

        <div className="my-auto py-12 z-10 max-w-lg space-y-5">
          {inviteStatus === 'valid' && inviteInfo ? (
            <>
              <p className="text-[#C98A3E] text-sm font-semibold uppercase tracking-widest">
                Undangan Diterima
              </p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Bergabung sebagai<br />Asisten Dokter.
              </h1>
              <div className="rounded-xl bg-white/10 border border-white/20 p-5 space-y-1">
                <p className="text-xs text-white/50 uppercase tracking-widest font-medium">Mengundang dari</p>
                <p className="text-xl font-bold text-white">{inviteInfo.doctorName}</p>
                <p className="text-sm text-white/70">{inviteInfo.specialization}</p>
              </div>
              <p className="text-white/60 text-sm">
                Buat akun Anda untuk mulai berkolaborasi, mengatur jadwal, dan mengelola perjalanan dinas.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Daftar via<br />Link Undangan.
              </h1>
              <p className="text-white/70 text-base">
                Pastikan Anda menggunakan link yang dikirimkan langsung oleh dokter Anda.
              </p>
            </>
          )}

          <div className="space-y-3 pt-4 border-t border-white/10 text-sm">
            {[
              'Role assistant aktif langsung setelah daftar',
              'Terhubung otomatis ke profil dokter pengundang',
              'Akses real-time ke jadwal, trip & tugas',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-[#C98A3E] shrink-0 mt-0.5" />
                <span className="text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="z-10 text-xs text-white/40">© 2026 Assistant Hub. All rights reserved.</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px] space-y-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#2E5266] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Login
          </Link>

          {/* Loading state */}
          {inviteStatus === 'loading' && (
            <Card className="border border-black/5 shadow-xl bg-white rounded-2xl overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#2E5266]" />
                <p className="text-sm text-muted-foreground">Memvalidasi link undangan…</p>
              </CardContent>
            </Card>
          )}

          {/* Invalid token state */}
          {inviteStatus === 'invalid' && (
            <Card className="border border-red-100 shadow-xl bg-white rounded-2xl overflow-hidden">
              <CardContent className="flex flex-col items-center text-center py-14 px-8 gap-4">
                <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                  <XCircle className="h-7 w-7 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-[#1C2430]">Link Undangan Tidak Valid</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {inviteError || 'Link undangan tidak ditemukan atau sudah kadaluarsa (berlaku 48 jam).'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Minta dokter Anda untuk membuat link undangan baru dari Dashboard.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="mt-2 rounded-lg">
                    Kembali ke Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Valid — show registration form */}
          {inviteStatus === 'valid' && (
            <Card className="border border-black/5 shadow-xl bg-white rounded-2xl overflow-hidden">
              <CardHeader className="pb-5 pt-8 px-8">
                <CardTitle className="text-2xl font-bold tracking-tight text-[#1C2430]">
                  Daftar sebagai Asisten
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Lengkapi data Anda. Akun akan otomatis terhubung ke profil dokter pengundang.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {formError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 flex items-start gap-2.5 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-[#1C2430]/70 uppercase tracking-wider">
                      Nama Lengkap
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Nama lengkap Anda"
                        value={form.name}
                        onChange={setField('name')}
                        required
                        disabled={isSubmitting}
                        className="pl-9 h-11 border-black/10 focus:border-[#2E5266] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-[#1C2430]/70 uppercase tracking-wider">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="asisten@email.com"
                        value={form.email}
                        onChange={setField('email')}
                        required
                        disabled={isSubmitting}
                        className="pl-9 h-11 border-black/10 focus:border-[#2E5266] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-semibold text-[#1C2430]/70 uppercase tracking-wider">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Min. 8 karakter"
                          value={form.password}
                          onChange={setField('password')}
                          required
                          disabled={isSubmitting}
                          className="pl-9 h-11 border-black/10 focus:border-[#2E5266] rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-semibold text-[#1C2430]/70 uppercase tracking-wider">
                        Konfirmasi
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Ulangi password"
                          value={form.confirmPassword}
                          onChange={setField('confirmPassword')}
                          required
                          disabled={isSubmitting}
                          className="pl-9 h-11 border-black/10 focus:border-[#2E5266] rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-[#2E5266] hover:bg-[#1E3643] text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    {isSubmitting ? 'Mendaftarkan...' : 'Daftar & Bergabung'}
                    {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground pt-1">
                    Sudah punya akun?{' '}
                    <Link href="/login" className="text-[#2E5266] font-semibold hover:underline">
                      Masuk di sini
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
export default function RegisterAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
          <Loader2 className="h-8 w-8 animate-spin text-[#2E5266]" />
        </div>
      }
    >
      <AssistantRegisterInner />
    </Suspense>
  );
}
