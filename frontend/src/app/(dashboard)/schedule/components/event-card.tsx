"use client"

import React, { useState } from 'react';
import { ScheduleEvent, EventType, EventStatus } from '@/types/api.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMembership } from '@/hooks/use-membership';
import { MapPinIcon, ClockIcon, Pencil, Trash, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScheduleForm } from './schedule-form';
import { apiFetch } from '@/lib/api';
import { queryClient } from '@/lib/query-client';

interface EventCardProps {
  event: ScheduleEvent;
}

export function EventCard({ event }: EventCardProps) {
  const { doctorProfileId, role, canMutate } = useMembership();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const typeColors: Record<EventType, string> = {
    clinic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    surgery: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    meeting: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    conference: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    flight: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    personal: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  };

  const statusColors: Record<EventStatus, string> = {
    tentative: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    confirmed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleConfirm = async () => {
    if (!doctorProfileId) return;
    setConfirming(true);
    try {
      await apiFetch(`/schedule-events/${event.id}/confirm?doctorProfileId=${doctorProfileId}`, {
        method: 'POST',
      });
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
    } catch (err) {
      console.error('Confirm event failed:', err);
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    if (!doctorProfileId) return;
    setDeleting(true);
    try {
      await apiFetch(`/schedule-events/${event.id}?doctorProfileId=${doctorProfileId}`, {
        method: 'DELETE',
      });
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Delete event failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Roles permitted to confirm: owner_assistant, assistant, doctor
  const canConfirm =
    event.status === 'tentative' &&
    (role === 'owner_assistant' || role === 'assistant' || role === 'doctor');

  return (
    <Card className="group relative overflow-hidden rounded-xl border bg-card hover:shadow-xs transition-all duration-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 pr-16 flex-1">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className={cn(typeColors[event.type], 'capitalize')}>
              {event.type}
            </Badge>
            <Badge variant="outline" className={cn(statusColors[event.status], 'capitalize')}>
              {event.status}
            </Badge>
            {event.isRecurring && (
              <Badge variant="outline" className="bg-sky-500/5 text-sky-500 border-sky-500/10 text-xs">
                Recurring
              </Badge>
            )}
          </div>
          <CardTitle className="text-base font-semibold pt-1">
            {event.title}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pb-4 space-y-3">
        {/* Timing Monospace */}
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded w-fit">
          <ClockIcon className="h-3.5 w-3.5" />
          <span>{formatDateTime(event.startDatetime)}</span>
          <span>&rarr;</span>
          <span>{formatDateTime(event.endDatetime)}</span>
          <span className="text-[10px] bg-muted px-1 rounded uppercase">{event.timezone}</span>
        </div>

        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {event.notes && (
          <p className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-2 italic">
            {event.notes}
          </p>
        )}

        {/* Confirmation Button for doctors or assistants */}
        {canConfirm && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleConfirm}
              disabled={confirming}
              className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/5 border-emerald-500/20"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{confirming ? 'Confirming...' : 'Konfirmasi Event'}</span>
            </Button>
          </div>
        )}
      </CardContent>

      {/* Edit/Delete controls for OA and AS */}
      {canMutate && (
        <div className="absolute top-4 right-4 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card rounded-lg">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></Button>} />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
              </DialogHeader>
              <ScheduleForm event={event} onSuccess={() => setIsEditDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash className="h-3.5 w-3.5" /></Button>} />
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-rose-500">Delete Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this event?
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
