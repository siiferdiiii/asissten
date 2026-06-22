"use client"

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useMembership } from '@/hooks/use-membership';
import { Trip, ScheduleEvent, ApiResponse } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard } from '../../schedule/components/event-card';
import { ScheduleForm } from '../../schedule/components/schedule-form';
import { TripForm } from '../components/trip-form';
import { CalendarIcon, MapPinIcon, ArrowLeft, PlusIcon, Pencil, Trash, Plane, Building, Briefcase, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { doctorProfileId, canMutate } = useMembership();
  const tripId = params.tripId as string;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch Trip Detail
  const { data: tripRes, isLoading: isTripLoading, error: tripError } = useQuery<ApiResponse<Trip>>({
    queryKey: ['trip', tripId, doctorProfileId],
    queryFn: () => apiFetch<ApiResponse<Trip>>(`/trips/${tripId}?doctorProfileId=${doctorProfileId}`),
    enabled: !!doctorProfileId && !!tripId,
  });

  // Fetch Events of this Trip
  const { data: eventsRes, isLoading: isEventsLoading } = useQuery<ApiResponse<ScheduleEvent[]>>({
    queryKey: ['schedule-events', { tripId, doctorProfileId }],
    queryFn: () => apiFetch<ApiResponse<ScheduleEvent[]>>(`/schedule-events?doctorProfileId=${doctorProfileId}&tripId=${tripId}`),
    enabled: !!doctorProfileId && !!tripId,
  });

  const trip = tripRes?.data;
  const events = eventsRes?.data || [];

  const handleDelete = async () => {
    if (!doctorProfileId) return;
    setDeleting(true);
    try {
      await apiFetch(`/trips/${tripId}?doctorProfileId=${doctorProfileId}`, {
        method: 'DELETE',
      });
      router.push('/trips');
    } catch (err) {
      console.error('Delete trip failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return dateStr.split('T')[0];
  };

  if (isTripLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-24" />
        <div className="border rounded-xl p-6 space-y-4 bg-card">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (tripError || !trip) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/trips')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Trips</span>
        </Button>
        <div className="rounded-xl border border-destructive/20 p-8 text-center bg-destructive/5 text-destructive">
          <h3 className="font-semibold text-lg">Trip Not Found</h3>
          <p className="text-sm mt-1">{(tripError as any)?.message || 'This trip could not be found or you do not have permission to view it.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/trips')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Trips</span>
        </Button>

        {canMutate && (
          <div className="flex gap-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                }
              />
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Trip</DialogTitle>
                </DialogHeader>
                <TripForm trip={trip} onSuccess={() => setIsEditDialogOpen(false)} />
              </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20">
                    <Trash className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                }
              />
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-rose-500">Delete Trip</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete this trip? This will soft delete this trip and its associated resources.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Trip Header details */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className="capitalize bg-primary/10 text-primary border-primary/20">
                {trip.status}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{trip.title}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4" />
                  <span>{trip.destinationCity}, {trip.destinationCountry}</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{formatDate(trip.startDate)} &rarr; {formatDate(trip.endDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {trip.purpose && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</h4>
            <p className="text-sm text-muted-foreground mt-1">{trip.purpose}</p>
          </div>
        )}
      </div>

      {/* Dashboard sub-features tabs */}
      <Tabs defaultValue="itinerary" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="itinerary" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Itinerary</span>
          </TabsTrigger>
          <TabsTrigger value="hotels" className="flex items-center gap-2">
            <Building className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Hotel Booking</span>
          </TabsTrigger>
          <TabsTrigger value="packing" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Packing Checklist</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Itinerary / ScheduleEvents */}
        <TabsContent value="itinerary" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">Itinerary Events</h3>
              <p className="text-xs text-muted-foreground">Flight, conference meeting, or surgeries linked to this trip.</p>
            </div>
            {canMutate && (
              <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                <DialogTrigger
                  render={
                    <Button size="sm" className="flex items-center gap-1.5">
                      <PlusIcon className="h-4 w-4" />
                      <span>Add Event</span>
                    </Button>
                  }
                />
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Event to Itinerary</DialogTitle>
                  </DialogHeader>
                  <ScheduleForm presetTripId={tripId} onSuccess={() => setIsAddEventOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {isEventsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card">
              <CalendarIcon className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
              <p className="font-semibold text-sm">No Events Linked</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Build the itinerary for this trip by linking flight schedules, meetings, and conferences.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Hotels (Placeholder for Phase 4) */}
        <TabsContent value="hotels" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Hotel Bookings</CardTitle>
              <CardDescription>View and manage hotel reservations during this trip.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Building className="h-10 w-10 text-muted-foreground mb-3 opacity-30 animate-pulse" />
              <p className="font-semibold text-sm">Hotel Module (Next Phase)</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                This feature will be fully active in Phase 4, enabling map picking, prices, and booking reference uploads.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Packing (Placeholder for Phase 5) */}
        <TabsContent value="packing" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Packing Checklist</CardTitle>
              <CardDescription>Auto-generate templates and check items packed.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground mb-3 opacity-30 animate-pulse" />
              <p className="font-semibold text-sm">Packing Module (Next Phase)</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                This feature will be fully active in Phase 5, enabling templating and status ticks.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Documents (Placeholder for Phase 6) */}
        <TabsContent value="documents" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Travel Documents</CardTitle>
              <CardDescription>Keep copies of flight tickets, visas, and passport pages.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3 opacity-30 animate-pulse" />
              <p className="font-semibold text-sm">Document Vault (Next Phase)</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                This feature will be fully active in Phase 6, enabling secure file uploads and downloads.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
