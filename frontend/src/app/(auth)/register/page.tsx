"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  BadgeCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialization: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Password tidak cocok. Pastikan kedua kolom password sama.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiFetch<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          specialization: form.specialization || undefined,
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
      setError(err.message || 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setIsLoading(false);
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
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Mulai kelola<br />operasional Anda.
          </h1>
          <p className="text-white/70 text-base md:text-lg">
            Daftar sebagai dokter — buat akun, lalu undang asisten Anda untuk mulai berkolaborasi secara real-time.
          </p>

          <div className="space-y-3 pt-4 border-t border-white/10 text-sm">
            {[
              'Akun Anda otomatis mendapat role Doctor',
              'Profil dokter dibuat langsung setelah daftar',
              'Undang asisten dari dashboard dengan satu klik',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <BadgeCheck className="h-4 w-4 text-[#C98A3E] shrink-0 mt-0.5" />
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

          <Card className="border border-black/5 shadow-xl bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-5 pt-8 px-8">
              <CardTitle className="text-2xl font-bold tracking-tight text-[#1C2430]">
                Daftar Akun Dokter
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Isi data di bawah ini. Akun Anda akan otomatis mendapat role <strong>Doctor</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 flex items-start gap-2.5 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-[#1C2430]/70 uppercase tracking-wider">
                    Nama Lengkap
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Dr. Andi Setiawan"
                      value={form.name}
                      onChange={setField('name')}
                      required
                      disabled={isLoading}
                      className="pl-9 h-11 border-black/10 focus:border-[#2E5266] rounded-lg"
                    />
                  </div>
                </div>

                {/* Specialization */}
                <div className="space-y-1.5">
                  <Label htmlFor="specialization" className="text-xs font-semibold text-[#1C2430]/70 uppercase tracking-wider">
                    Spesialisasi <span className="text-muted-foreground font-normal normal-case">(opsional)</span>
                  </Label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="specialization"
                      placeholder="Sp. Penyakit Dalam"
                      value={form.specialization}
                      onChange={setField('specialization')}
                      disabled={isLoading}
                      className="pl-9 h-11 border-black/10 focus:border-[#2E5266] rounded-lg"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-[#1C2430]/70 uppercase tracking-wider">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="dokter@rumahsakit.com"
                      value={form.email}
                      onChange={setField('email')}
                      required
                      disabled={isLoading}
                      className="pl-9 h-11 border-black/10 focus:border-[#2E5266] rounded-lg"
                    />
                  </div>
                </div>

                {/* Password row */}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
                        className="pl-9 h-11 border-black/10 focus:border-[#2E5266] rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#2E5266] hover:bg-[#1E3643] text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
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
        </div>
      </div>
    </div>
  );
}
