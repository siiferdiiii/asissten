"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMembership } from '@/hooks/use-membership';
import { SocketProvider } from '@/providers/socket-provider';
import { apiFetch } from '@/lib/api';
import { PlaneTakeoff, Calendar, History, LogOut, Menu, X, ChevronDown, User, Building2, Users, CheckSquare, UserPlus, Copy, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationInbox } from '@/components/ui/notification-inbox';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    doctorProfileId,
    role,
    memberships,
    switchProfile,
    userId,
  } = useMembership();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeProfileName, setActiveProfileName] = useState('Select Doctor Profile');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Invite assistant state (doctor role only)
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleGenerateInvite = async () => {
    if (!doctorProfileId) return;
    setIsGeneratingInvite(true);
    setInviteError(null);
    setInviteLink(null);
    try {
      const res = await apiFetch<any>('/auth/invite-assistant', {
        method: 'POST',
        body: JSON.stringify({ doctorProfileId }),
      });
      const { inviteToken } = res.data;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteLink(`${origin}/register/assistant?token=${inviteToken}`);
    } catch (err: any) {
      setInviteError(err.message || 'Gagal membuat link undangan.');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  useEffect(() => {
    const active = memberships.find((m) => m.doctorProfileId === doctorProfileId);
    if (active) {
      setActiveProfileName(
        active.doctorProfile?.specialization
          ? `Dr. ${active.doctorProfile.specialization}`
          : `Profile (${active.role})`
      );
    } else {
      setActiveProfileName('Select Doctor Profile');
    }
  }, [doctorProfileId, memberships]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('activeDoctorProfileId');
      localStorage.removeItem('memberships');
      localStorage.removeItem('userId');
      window.dispatchEvent(new Event('auth-logout'));
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    {
      name: 'Trips',
      href: '/trips',
      icon: PlaneTakeoff,
      roles: ['owner_assistant', 'assistant', 'doctor', 'viewer'],
    },
    {
      name: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      roles: ['owner_assistant', 'assistant', 'doctor', 'viewer'],
    },
    {
      name: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      roles: ['owner_assistant', 'assistant', 'doctor', 'viewer'],
    },
    {
      name: 'Log Aktivitas',
      href: '/activity-logs',
      icon: History,
      roles: ['owner_assistant'],
    },
    {
      name: 'Team Members',
      href: '/team',
      icon: Users,
      roles: ['owner_assistant', 'assistant', 'doctor', 'viewer'],
    },
  ];

  const activeNavItems = navItems.filter((item) => role && item.roles.includes(role));

  const pageTitle = (() => {
    if (pathname === '/trips') return 'Trip Management';
    if (pathname.startsWith('/trips/')) return 'Trip Details';
    if (pathname === '/schedule') return 'Calendar & Schedule';
    if (pathname === '/tasks') return 'Task Board';
    if (pathname === '/activity-logs') return 'Log Aktivitas';
    if (pathname === '/team') return 'Team Directory';
    return 'Dashboard';
  })();

  const layoutContent = (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 md:static md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/trips" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <Building2 className="h-6 w-6 text-primary" />
            <span>Assistant Hub</span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Profile Switcher */}
        <div className="p-4 border-b">
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden text-left">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{activeProfileName}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 z-50 rounded-lg border bg-popover p-1 shadow-lg text-popover-foreground">
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Switch Profile</p>
                {memberships.length === 0 ? (
                  <p className="px-3 py-1.5 text-xs text-muted-foreground">No active profiles</p>
                ) : (
                  memberships.map((m) => (
                    <button
                      key={m.doctorProfileId}
                      onClick={() => {
                        switchProfile(m.doctorProfileId);
                        setIsProfileDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left",
                        m.doctorProfileId === doctorProfileId && "bg-muted"
                      )}
                    >
                      <span className="truncate">
                        Dr. {m.doctorProfile?.specialization || 'Profile'} ({m.role})
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {activeNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Invite Assistant Panel — doctor role only */}
        {role === 'doctor' && doctorProfileId && (
          <div className="px-4 pb-3 border-b">
            <button
              onClick={() => { setIsInviteOpen(!isInviteOpen); setInviteLink(null); setInviteError(null); }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Undang Asisten
              </span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', isInviteOpen && 'rotate-180')} />
            </button>

            {isInviteOpen && (
              <div className="mt-2 space-y-2 px-1">
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Generate link undangan (berlaku 48 jam) untuk asisten bergabung ke profil dokter Anda.
                </p>

                {inviteError && (
                  <p className="text-[11px] text-destructive">{inviteError}</p>
                )}

                {inviteLink ? (
                  <div className="space-y-1.5">
                    <div className="rounded-md bg-muted/60 border px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground break-all leading-relaxed">
                      {inviteLink}
                    </div>
                    <button
                      onClick={handleCopyInvite}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium py-1.5 hover:opacity-90 transition-opacity"
                    >
                      {isCopied ? (
                        <><Check className="h-3.5 w-3.5" /> Tersalin!</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> Salin Link</>  
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateInvite}
                    disabled={isGeneratingInvite}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium py-1.5 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {isGeneratingInvite ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Membuat Link...</>
                    ) : (
                      <><UserPlus className="h-3.5 w-3.5" /> Generate Link Undangan</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Role</p>
              <p className="text-sm font-medium text-foreground capitalize truncate">{role?.replace('_', ' ')}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b px-6 bg-card shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="font-semibold text-lg text-foreground truncate">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Inbox — only shown when user has an active profile */}
            {doctorProfileId && userId && (
              <NotificationInbox />
            )}
            {role && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20 capitalize">
                {role.replace('_', ' ')} Mode
              </span>
            )}
          </div>
        </header>

        {/* Inner Content scrollable */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );

  // Wrap with SocketProvider only when we have an active session
  if (doctorProfileId && userId) {
    return (
      <SocketProvider userId={userId} doctorProfileId={doctorProfileId}>
        {layoutContent}
      </SocketProvider>
    );
  }

  return layoutContent;
}
