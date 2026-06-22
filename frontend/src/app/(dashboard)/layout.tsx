"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMembership } from '@/hooks/use-membership';
import { PlaneTakeoff, Calendar, History, Settings, LogOut, Menu, X, ChevronDown, User, Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
    isOwnerAssistant,
  } = useMembership();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeProfileName, setActiveProfileName] = useState('Select Doctor Profile');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    // Get active profile's detail from memberships
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
      // Clear client session and redirect
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
      name: 'Log Aktivitas',
      href: '/activity-logs',
      icon: History,
      roles: ['owner_assistant'], // Only owner_assistant
    },
    {
      name: 'Team Members',
      href: '/team',
      icon: Users,
      roles: ['owner_assistant', 'assistant', 'doctor', 'viewer'],
    },
  ];

  const activeNavItems = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar collapsible */}
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

        {/* Sidebar Footer / User Info */}
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
            <h2 className="font-semibold text-lg text-foreground truncate">
              {pathname === '/trips' && 'Trip Management'}
              {pathname.startsWith('/trips/') && 'Trip Details'}
              {pathname === '/schedule' && 'Calendar & Schedule'}
              {pathname === '/activity-logs' && 'Log Aktivitas'}
              {pathname === '/team' && 'Team Directory'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
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
}
