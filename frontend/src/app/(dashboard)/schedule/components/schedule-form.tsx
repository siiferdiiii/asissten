"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useMembership } from '@/hooks/use-membership';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScheduleEvent, EventType, EventStatus, Trip, ApiResponse } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';

const scheduleSchema = zod.object({
  title: zod.string().min(1, 'Title is required'),
  type: zod.enum(['clinic', 'surgery', 'meeting', 'conference', 'flight', 'personal'] as const),
  startDatetime: zod.string().min(1, 'Start date & time is required'),
  endDatetime: zod.string().min(1, 'End date & time is required'),
  timezone: zod.string().min(1, 'Timezone is required'),
  location: zod.string().optional(),
  isRecurring: zod.boolean().default(false),
  recurrenceRule: zod.string().optional(),
  status: zod.enum(['tentative', 'confirmed'] as const),
  notes: zod.string().optional(),
  tripId: zod.string().optional(),
}).refine((data) => {
  return new Date(data.endDatetime) > new Date(data.startDatetime);
}, {
  message: 'End datetime must be after start datetime',
  path: ['endDatetime'],
}).refine((data) => {
  if (data.isRecurring && !data.recurrenceRule) {
    return false;
  }
  return true;
}, {
  message: 'Recurrence rule is required when recurring is enabled',
  path: ['recurrenceRule'],
});

type ScheduleFormValues = zod.infer<typeof scheduleSchema>;

interface ScheduleFormProps {
  event?: ScheduleEvent;
  presetTripId?: string;
  onSuccess: () => void;
}

export function ScheduleForm({ event, presetTripId, onSuccess }: ScheduleFormProps) {
  const { doctorProfileId } = useMembership();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [conflictNames, setConflictNames] = useState<string[]>([]);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const handleRevert = async () => {
    if (!doctorProfileId) return;
    try {
      setLoading(true);
      if (event) {
        await apiFetch(`/schedule-events/${event.id}?doctorProfileId=${doctorProfileId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            startDatetime: event.startDatetime,
            endDatetime: event.endDatetime,
            status: event.status,
          }),
        });
      } else if (createdEventId) {
        await apiFetch(`/schedule-events/${createdEventId}?doctorProfileId=${doctorProfileId}`, {
          method: 'DELETE',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      setShowOverlapModal(false);
    } catch (err) {
      console.error('Revert failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch trips for linking dropdown
  const { data: tripsRes } = useQuery<ApiResponse<Trip[]>>({
    queryKey: ['trips', doctorProfileId],
    queryFn: () => apiFetch<ApiResponse<Trip[]>>(`/trips?doctorProfileId=${doctorProfileId}`),
    enabled: !!doctorProfileId,
  });

  const trips = tripsRes?.data || [];

  const formatLocalISO = (isoStr: string) => {
    const date = new Date(isoStr);
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime( ) - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const defaultValues: Partial<ScheduleFormValues> = event
    ? {
        title: event.title,
        type: event.type,
        startDatetime: formatLocalISO(event.startDatetime),
        endDatetime: formatLocalISO(event.endDatetime),
        timezone: event.timezone,
        location: event.location || '',
        isRecurring: event.isRecurring,
        recurrenceRule: event.recurrenceRule || '',
        status: event.status === 'cancelled' ? 'tentative' : event.status,
        notes: event.notes || '',
        tripId: event.tripId || '',
      }
    : {
        title: '',
        type: 'meeting',
        startDatetime: '',
        endDatetime: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        location: '',
        isRecurring: false,
        recurrenceRule: '',
        status: 'tentative',
        notes: '',
        tripId: presetTripId || '',
      };

  const form = useForm<ScheduleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(scheduleSchema) as any,
    defaultValues,
  });

  const isRecurring = form.watch('isRecurring');

  const onSubmit = async (values: ScheduleFormValues) => {
    if (!doctorProfileId) {
      setErrorMsg('No active doctor profile selected');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setWarnings([]);

    const bodyPayload = {
      ...values,
      doctorProfileId,
      // Map empty string to undefined/null for backend
      tripId: values.tripId === '' ? undefined : values.tripId,
      recurrenceRule: values.isRecurring ? values.recurrenceRule : undefined,
      startDatetime: new Date(values.startDatetime).toISOString(),
      endDatetime: new Date(values.endDatetime).toISOString(),
    };

    try {
      let res: any;
      if (event) {
        // Edit event
        res = await apiFetch(`/schedule-events/${event.id}?doctorProfileId=${doctorProfileId}`, {
          method: 'PATCH',
          body: JSON.stringify(bodyPayload),
        });
      } else {
        // Create event
        res = await apiFetch('/schedule-events', {
          method: 'POST',
          body: JSON.stringify(bodyPayload),
        });
        if (res?.data?.id) {
          setCreatedEventId(res.data.id);
        }
      }

      // Check if warnings/overlaps exist
      if (res.warnings && res.warnings.length > 0) {
        const names = res.warnings[0].conflictsWith.map((c: any) => c.title);
        setConflictNames(names);
        setShowOverlapModal(true);
        queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Overlap warnings confirmation modal */}
      {showOverlapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-background border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-yellow-605">
              <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
              <span>Jadwal Bentrok</span>
            </h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Waktu yang Anda pilih bentrok dengan jadwal berikut:
              </p>
              <ul className="list-disc pl-5 font-semibold text-foreground">
                {conflictNames.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
              <p className="text-xs pt-2">
                Apakah Anda tetap ingin menyimpan perubahan?
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={handleRevert}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                variant="default"
                className="bg-yellow-605 hover:bg-yellow-700 text-white border-0"
                onClick={() => {
                  setShowOverlapModal(false);
                  onSuccess();
                }}
                disabled={loading}
              >
                Ya, Tetap Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {warnings.length === 0 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium">
                {errorMsg}
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Clinic Shift, Surgery: Patient A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="clinic">Clinic</SelectItem>
                        <SelectItem value="surgery">Surgery</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="flight">Flight</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tentative">Tentative</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDatetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Datetime</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDatetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Datetime</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Input placeholder="Asia/Jakarta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tripId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Trip (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trip" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None / No Trip</SelectItem>
                        {trips.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.title} ({t.destinationCity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Room 402, Siloam Hospital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring Toggle */}
            <div className="space-y-3 rounded-lg border p-3">
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-sm font-medium">Recurring Event</FormLabel>
                      <p className="text-xs text-muted-foreground">Does this event repeat?</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                )}
              />

              {isRecurring && (
                <FormField
                  control={form.control}
                  name="recurrenceRule"
                  render={({ field }) => (
                    <FormItem className="pt-2">
                      <FormLabel className="text-xs">Recurrence Rule (RRULE String)</FormLabel>
                      <FormControl>
                        <Input placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Bring patient chart, request anesthesia assistant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
