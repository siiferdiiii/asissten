'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMembership } from '@/hooks/use-membership';
import { Hotel, ApiResponse } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { HotelForm } from './hotel-form';
import {
  Building2,
  PlusIcon,
  Pencil,
  Trash2,
  MapPin,
  CalendarRange,
  ExternalLink,
  CreditCard,
} from 'lucide-react';

const BOOKING_STATUS_COLORS: Record<string, string> = {
  searching: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  booked: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  confirmed: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const PLATFORM_LABELS: Record<string, string> = {
  traveloka: 'Traveloka',
  agoda: 'Agoda',
  booking_com: 'Booking.com',
  other: 'Other',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function googleMapsLink(hotel: Hotel): string | null {
  if (hotel.placeId) {
    return `https://www.google.com/maps/dir/?api=1&destination_place_id=${hotel.placeId}`;
  }
  if (hotel.formattedAddress) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotel.formattedAddress)}`;
  }
  return null;
}

interface HotelListProps {
  tripId: string;
}

export function HotelList({ tripId }: HotelListProps) {
  const queryClient = useQueryClient();
  const { doctorProfileId, canMutate } = useMembership();
  const [addOpen, setAddOpen] = useState(false);
  const [editHotel, setEditHotel] = useState<Hotel | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: hotelsRes, isLoading } = useQuery<Hotel[]>({
    queryKey: ['hotels', tripId],
    queryFn: () =>
      apiFetch<ApiResponse<Hotel[]>>(
        `/trips/${tripId}/hotels?doctorProfileId=${doctorProfileId}`,
      ).then((r) => r.data),
    enabled: !!doctorProfileId && !!tripId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/hotels/${id}?doctorProfileId=${doctorProfileId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels', tripId] });
      setDeletingId(null);
    },
  });

  const hotels = hotelsRes ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Hotel Bookings</h3>
          <p className="text-xs text-muted-foreground">
            Manage accommodations for this trip.
          </p>
        </div>
        {canMutate && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="flex items-center gap-1.5">
                  <PlusIcon className="h-4 w-4" />
                  <span>Add Hotel</span>
                </Button>
              }
            />
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Hotel Booking</DialogTitle>
              </DialogHeader>
              <HotelForm tripId={tripId} onSuccess={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Empty state */}
      {hotels.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card">
          <Building2 className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
          <p className="font-semibold text-sm">No Hotel Bookings</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Add hotel bookings to keep track of accommodations during this trip.
          </p>
        </div>
      )}

      {/* Hotel cards */}
      <div className="space-y-3">
        {hotels.map((hotel) => {
          const mapsLink = googleMapsLink(hotel);
          return (
            <Card key={hotel.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Hotel name + status badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm truncate">{hotel.name}</span>
                      <Badge
                        variant="outline"
                        className={`capitalize text-xs ${BOOKING_STATUS_COLORS[hotel.bookingStatus] ?? ''}`}
                      >
                        {hotel.bookingStatus.replace('_', ' ')}
                      </Badge>
                      {hotel.platform && (
                        <Badge variant="outline" className="text-xs">
                          {PLATFORM_LABELS[hotel.platform] ?? hotel.platform}
                        </Badge>
                      )}
                    </div>

                    {/* Address */}
                    {hotel.formattedAddress && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{hotel.formattedAddress}</span>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {formatDate(hotel.checkIn)} → {formatDate(hotel.checkOut)}
                      </span>
                    </div>

                    {/* Price + booking ref */}
                    {(hotel.price || hotel.bookingReference) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {hotel.price && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3.5 w-3.5" />
                            {hotel.currency ?? ''} {Number(hotel.price).toLocaleString()}
                          </span>
                        )}
                        {hotel.bookingReference && (
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                            #{hotel.bookingReference}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {mapsLink && (
                      <a
                        href={mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Directions</span>
                      </a>
                    )}
                    {canMutate && (
                      <>
                        <Dialog
                          open={editHotel?.id === hotel.id}
                          onOpenChange={(o) => setEditHotel(o ? hotel : null)}
                        >
                          <DialogTrigger
                            render={
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Edit Hotel Booking</DialogTitle>
                            </DialogHeader>
                            <HotelForm
                              tripId={tripId}
                              hotel={hotel}
                              onSuccess={() => setEditHotel(null)}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingId(hotel.id)}
                          disabled={deleteMutation.isPending && deletingId === hotel.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-500">Delete Hotel Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this hotel booking? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
