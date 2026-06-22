"use client"

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMembership } from '@/hooks/use-membership';
import { Trip, TripStatus, ApiResponse } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { TripCard } from './components/trip-card';
import { TripForm } from './components/trip-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusIcon, SearchIcon, FilterIcon, Plane } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function TripsPage() {
  const { doctorProfileId, canMutate } = useMembership();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading, error } = useQuery<ApiResponse<Trip[]>>({
    queryKey: ['trips', doctorProfileId, status, search],
    queryFn: () => {
      let url = `/trips?doctorProfileId=${doctorProfileId}`;
      if (status && status !== 'all') {
        url += `&status=${status}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      return apiFetch<ApiResponse<Trip[]>>(url);
    },
    enabled: !!doctorProfileId,
  });

  const trips = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trips</h1>
          <p className="text-muted-foreground text-sm">
            Manage conferences, flights, and travel schedules for your doctor profile.
          </p>
        </div>

        {canMutate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button className="shrink-0 flex items-center gap-2"><PlusIcon className="h-4 w-4" /><span>New Trip</span></Button>} />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Trip</DialogTitle>
              </DialogHeader>
              <TripForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search trips by title or destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-3">
          <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid List */}
      {!doctorProfileId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card">
          <Plane className="h-10 w-10 text-muted-foreground mb-4 animate-bounce" />
          <h3 className="font-semibold text-lg">No Doctor Profile Selected</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Please switch to or select a doctor profile from the sidebar to view trips.
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border p-4 space-y-3 bg-card">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="pt-2">
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6 mt-1" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 p-8 text-center bg-destructive/5 text-destructive">
          <p className="font-semibold">Error Loading Trips</p>
          <p className="text-sm mt-1">{(error as any).message || 'Something went wrong. Please check connection.'}</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center bg-card">
          <Plane className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="font-semibold text-lg">No trips found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {search || status !== 'all'
              ? 'Try modifying your search query or filters.'
              : 'Add your first trip to organize schedules, flight details, and notes.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
