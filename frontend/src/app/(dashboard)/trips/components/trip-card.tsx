"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trip, TripStatus } from '@/types/api.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMembership } from '@/hooks/use-membership';
import { CalendarIcon, MapPinIcon, Pencil, Trash, MoreVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TripForm } from './trip-form';
import { apiFetch } from '@/lib/api';
import { queryClient } from '@/lib/query-client';

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const router = useRouter();
  const { doctorProfileId, canMutate } = useMembership();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusColors: Record<TripStatus, string> = {
    planning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    confirmed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    ongoing: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    completed: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  const formatDate = (dateStr: string) => {
    return dateStr.split('T')[0];
  };

  const handleDelete = async () => {
    if (!doctorProfileId) return;
    setDeleting(true);
    try {
      await apiFetch(`/trips/${trip.id}?doctorProfileId=${doctorProfileId}`, {
        method: 'DELETE',
      });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Delete trip failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden rounded-xl border bg-card hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div 
          onClick={() => router.push(`/trips/${trip.id}`)}
          className="cursor-pointer space-y-1 pr-6 flex-1"
        >
          <CardTitle className="line-clamp-2 text-base font-semibold group-hover:text-primary transition-colors">
            {trip.title}
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPinIcon className="h-3.5 w-3.5" />
            <span>{trip.destinationCity}, {trip.destinationCountry}</span>
          </div>
        </div>
        
        {/* Status Badge */}
        <Badge variant="outline" className={statusColors[trip.status]}>
          {trip.status}
        </Badge>
      </CardHeader>
      
      <CardContent 
        onClick={() => router.push(`/trips/${trip.id}`)}
        className="cursor-pointer pb-4"
      >
        {trip.purpose && (
          <p className="line-clamp-2 text-sm text-muted-foreground mb-4">
            {trip.purpose}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>{formatDate(trip.startDate)}</span>
          <span>&rarr;</span>
          <span>{formatDate(trip.endDate)}</span>
        </div>
      </CardContent>

      {/* Action Buttons for OA and AS */}
      {canMutate && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card pl-2 py-0.5 rounded-lg">
          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></Button>} />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Trip</DialogTitle>
              </DialogHeader>
              <TripForm trip={trip} onSuccess={() => setIsEditDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          {/* Delete Confirm Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash className="h-4 w-4" /></Button>} />
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-rose-500">Delete Trip</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this trip? This will also soft delete all scheduled events, hotels, packing lists, and tasks associated with it.
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
    </Card>
  );
}
