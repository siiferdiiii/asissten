"use client"

import { useState, useEffect } from 'react';
import { MembershipRole } from '@/types/api.types';

export interface ActiveMembership {
  id: string;
  userId: string;
  doctorProfileId: string;
  role: MembershipRole;
  status: string;
}

export function useMembership() {
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);
  const [role, setRole] = useState<MembershipRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = () => {
      const activeId = localStorage.getItem('activeDoctorProfileId');
      const storedUserId = localStorage.getItem('userId');
      const storedMems = localStorage.getItem('memberships');

      setDoctorProfileId(activeId);
      setUserId(storedUserId);

      if (storedMems) {
        try {
          const parsed = JSON.parse(storedMems);
          setMemberships(parsed);
          const activeMem = parsed.find((m: any) => m.doctorProfileId === activeId);
          if (activeMem) {
            setRole(activeMem.role);
          } else {
            setRole(null);
          }
        } catch {
          setRole(null);
        }
      } else {
        setMemberships([]);
        setRole(null);
      }
    };

    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-login', handleStorageChange);
    window.addEventListener('auth-logout', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-login', handleStorageChange);
      window.removeEventListener('auth-logout', handleStorageChange);
    };
  }, []);

  const switchProfile = (profileId: string) => {
    localStorage.setItem('activeDoctorProfileId', profileId);
    window.dispatchEvent(new Event('storage'));
  };

  const hasRole = (allowedRoles: MembershipRole[]) => {
    return role ? allowedRoles.includes(role) : false;
  };

  return {
    doctorProfileId,
    role,
    userId,
    memberships,
    switchProfile,
    hasRole,
    isOwnerAssistant: role === 'owner_assistant',
    isAssistant: role === 'assistant',
    isDoctor: role === 'doctor',
    isViewer: role === 'viewer',
    canMutate: role === 'owner_assistant' || role === 'assistant',
  };
}
