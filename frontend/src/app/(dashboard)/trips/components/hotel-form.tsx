'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useQueryClient } from '@tanstack/react-query';
import { useMembership } from '@/hooks/use-membership';
import { Hotel } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
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

const schema = z.object({
  name: z.string().min(1, 'Hotel name is required'),
  formattedAddress: z.string().optional(),
  checkIn: z.string().min(1, 'Check-in date is required'),
  checkOut: z.string().min(1, 'Check-out date is required'),
  bookingStatus: z.enum(['searching', 'booked', 'confirmed', 'cancelled']),
  bookingReference: z.string().optional(),
  price: z.string().optional(),
  currency: z.string().optional(),
  platform: z.enum(['traveloka', 'agoda', 'booking_com', 'other', '']).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface HotelFormProps {
  tripId: string;
  hotel?: Hotel;
  onSuccess: () => void;
}

export function HotelForm({ tripId, hotel, onSuccess }: HotelFormProps) {
  const queryClient = useQueryClient();
  const { doctorProfileId } = useMembership();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      name: hotel?.name ?? '',
      formattedAddress: hotel?.formattedAddress ?? '',
      checkIn: hotel?.checkIn ? hotel.checkIn.split('T')[0] : '',
      checkOut: hotel?.checkOut ? hotel.checkOut.split('T')[0] : '',
      bookingStatus: hotel?.bookingStatus ?? 'searching',
      bookingReference: hotel?.bookingReference ?? '',
      price: hotel?.price != null ? String(hotel.price) : '',
      currency: hotel?.currency ?? 'IDR',
      platform: hotel?.platform ?? '',
      notes: hotel?.notes ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      formattedAddress: values.formattedAddress || undefined,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      bookingStatus: values.bookingStatus,
      bookingReference: values.bookingReference || undefined,
      price: values.price ? parseFloat(values.price) : undefined,
      currency: values.currency || undefined,
      platform: values.platform || undefined,
      notes: values.notes || undefined,
    };

    if (hotel) {
      await apiFetch(`/hotels/${hotel.id}?doctorProfileId=${doctorProfileId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch(`/trips/${tripId}/hotels?doctorProfileId=${doctorProfileId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    queryClient.invalidateQueries({ queryKey: ['hotels', tripId] });
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hotel Name</FormLabel>
              <FormControl>
                <Input placeholder="Grand Hyatt" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="formattedAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Jl. Sudirman No.1, Jakarta" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="checkIn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="checkOut"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-out</FormLabel>
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
          name="bookingStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Booking Status</FormLabel>
              <Select value={field.value} onValueChange={(v) => field.onChange(v ?? 'searching')}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="searching">Searching</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Platform</FormLabel>
              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v ?? '')}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="traveloka">Traveloka</SelectItem>
                  <SelectItem value="agoda">Agoda</SelectItem>
                  <SelectItem value="booking_com">Booking.com</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <Input placeholder="IDR" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bookingReference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Booking Reference</FormLabel>
              <FormControl>
                <Input placeholder="BK-12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Extra notes…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? hotel
                ? 'Saving…'
                : 'Adding…'
              : hotel
                ? 'Save Changes'
                : 'Add Hotel'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
