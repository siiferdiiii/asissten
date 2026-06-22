"use client"

import React from 'react';
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
import { Trip } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { queryClient } from '@/lib/query-client';

const tripSchema = zod.object({
  title: zod.string().min(1, 'Title is required'),
  destinationCity: zod.string().min(1, 'City is required'),
  destinationCountry: zod.string().min(1, 'Country is required'),
  startDate: zod.string().min(1, 'Start date is required'),
  endDate: zod.string().min(1, 'End date is required'),
  purpose: zod.string().optional(),
}).refine((data) => {
  return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: 'End date cannot be before start date',
  path: ['endDate'],
});

type TripFormValues = zod.infer<typeof tripSchema>;

interface TripFormProps {
  trip?: Trip;
  onSuccess: () => void;
}

export function TripForm({ trip, onSuccess }: TripFormProps) {
  const { doctorProfileId } = useMembership();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const defaultValues: Partial<TripFormValues> = trip
    ? {
        title: trip.title,
        destinationCity: trip.destinationCity,
        destinationCountry: trip.destinationCountry,
        startDate: trip.startDate.split('T')[0],
        endDate: trip.endDate.split('T')[0],
        purpose: trip.purpose || '',
      }
    : {
        title: '',
        destinationCity: '',
        destinationCountry: '',
        startDate: '',
        endDate: '',
        purpose: '',
      };

  const form = useForm<TripFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(tripSchema) as any,
    defaultValues,
  });

  const onSubmit = async (values: TripFormValues) => {
    if (!doctorProfileId) {
      setErrorMsg('No active doctor profile selected');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (trip) {
        // Edit trip
        await apiFetch(`/trips/${trip.id}?doctorProfileId=${doctorProfileId}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
      } else {
        // Create trip
        await apiFetch('/trips', {
          method: 'POST',
          body: JSON.stringify({
            ...values,
            doctorProfileId,
          }),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['trips'] });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <FormLabel>Trip Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Medical Conference 2026" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="destinationCity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Kyoto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="destinationCountry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Japan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Presenting surgical research" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : trip ? 'Update Trip' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
