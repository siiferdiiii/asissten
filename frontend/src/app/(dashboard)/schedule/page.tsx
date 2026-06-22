"use client"

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMembership } from '@/hooks/use-membership';
import { ScheduleEvent, EventType, EventStatus, ApiResponse } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { EventCard } from './components/event-card';
import { ScheduleForm } from './components/schedule-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PlusIcon,
  CalendarDays,
  ListIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function SchedulePage() {
  const { doctorProfileId, canMutate } = useMembership();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCellDate, setSelectedCellDate] = useState<string | undefined>(undefined);

  // Calculate start/end date of the current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Format dates for backend Query
  const fromDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const toDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;

  const { data, isLoading, error } = useQuery<ApiResponse<ScheduleEvent[]>>({
    queryKey: ['schedule-events', doctorProfileId, typeFilter, statusFilter, fromDateStr, toDateStr],
    queryFn: () => {
      let url = `/schedule-events?doctorProfileId=${doctorProfileId}`;
      if (typeFilter && typeFilter !== 'all') url += `&type=${typeFilter}`;
      if (statusFilter && statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (viewMode === 'calendar') {
        url += `&from=${fromDateStr}&to=${toDateStr}`;
      }
      return apiFetch<ApiResponse<ScheduleEvent[]>>(url);
    },
    enabled: !!doctorProfileId,
  });

  const events = data?.data || [];

  // Generate calendar days grid
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday...

  const calendarCells: (Date | null)[] = [];
  // Empty leading days
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push(null);
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(new Date(year, month, d));
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(currentDate.getMonth() + (direction === 'prev' ? -1 : 1));
    setCurrentDate(nextDate);
  };

  const getEventsForDate = (date: Date) => {
    const compareStr = date.toISOString().split('T')[0];
    return events.filter((e) => e.startDatetime.split('T')[0] === compareStr);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar & Schedule</h1>
          <p className="text-muted-foreground text-sm">
            Track shifts, flights, surgery schedule, and event bookings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle View */}
          <div className="flex rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="h-8 gap-1.5 px-3 rounded-md"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Calendar</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 gap-1.5 px-3 rounded-md"
            >
              <ListIcon className="h-4 w-4" />
              <span>List</span>
            </Button>
          </div>

          {canMutate && (
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) setSelectedCellDate(undefined);
            }}>
              <DialogTrigger render={<Button size="sm" className="flex items-center gap-1.5"><PlusIcon className="h-4 w-4" /><span>New Event</span></Button>} />
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Schedule Event</DialogTitle>
                </DialogHeader>
                <ScheduleForm
                  presetTripId=""
                  onSuccess={() => {
                    setIsCreateOpen(false);
                    setSelectedCellDate(undefined);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {viewMode === 'calendar' && (
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-2xs">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')} className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[120px] text-center font-mono">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')} className="h-7 w-7">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex flex-1 flex-wrap gap-2 justify-end">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
            <SelectTrigger className="w-[140px] h-9">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Event Type" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="clinic">Clinic</SelectItem>
              <SelectItem value="surgery">Surgery</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="conference">Conference</SelectItem>
              <SelectItem value="flight">Flight</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="tentative">Tentative</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Display Section */}
      {!doctorProfileId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card">
          <CalendarDays className="h-10 w-10 text-muted-foreground mb-4 animate-bounce" />
          <h3 className="font-semibold text-lg">No Doctor Profile Selected</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Please switch to or select a doctor profile from the sidebar to view schedules.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 p-8 text-center bg-destructive/5 text-destructive">
          <p className="font-semibold">Error Loading Events</p>
          <p className="text-sm mt-1">{(error as any).message || 'Something went wrong. Please check connection.'}</p>
        </div>
      ) : viewMode === 'list' ? (
        events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center bg-card">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-semibold text-lg">No events scheduled</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Add conferences, flights, clinics, or surgeries to display in the list view.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )
      ) : (
        /* Calendar Monthly Grid View */
        <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
          {/* Days of Week Headers */}
          <div className="grid grid-cols-7 border-b bg-muted/20 text-center text-xs font-semibold py-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y border-t-0">
            {calendarCells.map((date, idx) => {
              if (date === null) {
                return (
                  <div key={`empty-${idx}`} className="bg-muted/10 h-28 p-1 text-xs text-muted-foreground" />
                );
              }

              const cellEvents = getEventsForDate(date);
              const isToday = new Date().toDateString() === date.toDateString();

              return (
                <div
                  key={`day-${date.getDate()}`}
                  className={cn(
                    "h-28 p-1 text-xs space-y-1 overflow-y-auto hover:bg-muted/30 transition-colors relative flex flex-col group",
                    isToday && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "font-medium h-5 w-5 flex items-center justify-center rounded-full text-[11px]",
                        isToday && "bg-primary text-primary-foreground font-bold"
                      )}
                    >
                      {date.getDate()}
                    </span>

                    {/* Cell Add Shortcut */}
                    {canMutate && (
                      <button
                        onClick={() => {
                          setSelectedCellDate(date.toISOString().split('T')[0]);
                          setIsCreateOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-muted"
                      >
                        <PlusIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    {cellEvents.slice(0, 3).map((e) => {
                      const badgeColors: Record<EventType, string> = {
                        clinic: 'bg-blue-500/10 text-blue-600',
                        surgery: 'bg-rose-500/10 text-rose-600',
                        meeting: 'bg-amber-500/10 text-amber-600',
                        conference: 'bg-violet-500/10 text-violet-600',
                        flight: 'bg-cyan-500/10 text-cyan-600',
                        personal: 'bg-zinc-500/10 text-zinc-600',
                      };
                      return (
                        <div
                          key={e.id}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] truncate border border-transparent font-medium",
                            badgeColors[e.type]
                          )}
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      );
                    })}
                    {cellEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground font-semibold pl-1">
                        +{cellEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
