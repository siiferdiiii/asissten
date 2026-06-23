import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, disconnectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';
import { Bell, X } from 'lucide-react';

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

export function useSocketContext() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: React.ReactNode;
  userId: string;
  doctorProfileId: string;
}

export function SocketProvider({ children, userId, doctorProfileId }: SocketProviderProps) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    // ─── Helper to show toast (simple browser notification) ────────────────
    const notify = (msg: string, actorId: string) => {
      if (actorId !== userId) {
        // Use native browser notification or a simple console warning
        // Full toast library can be added later
        console.info(`[Realtime] ${msg} by ${actorId}`);
      }
    };

    // ─── Trip events ────────────────────────────────────────────────────────
    socket.on('trip.created', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      notify('New trip created', actorId);
    });

    socket.on('trip.updated', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.setQueryData(['trip', data.id, doctorProfileId], (prev: unknown) =>
        prev ? { ...(prev as Record<string, unknown>), data } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      notify('Trip updated', actorId);
    });

    socket.on('trip.deleted', ({ data, actorId }: { data: { id: string; doctorProfileId: string }; actorId: string }) => {
      queryClient.removeQueries({ queryKey: ['trip', data.id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      notify('Trip deleted', actorId);
    });

    // ─── Schedule events ────────────────────────────────────────────────────
    socket.on('schedule_event.created', ({ actorId }: { data: unknown; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      notify('New schedule event created', actorId);
    });

    socket.on('schedule_event.updated', ({ actorId }: { data: unknown; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      notify('Schedule event updated', actorId);
    });

    socket.on('schedule_event.deleted', ({ actorId }: { data: unknown; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      notify('Schedule event deleted', actorId);
    });

    socket.on('schedule_event.statusChanged', ({ actorId }: { data: unknown; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      notify('Event status changed', actorId);
    });

    // ─── Hotel events ───────────────────────────────────────────────────────
    socket.on('hotel.created', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['hotels', data.tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      notify('New hotel booking added', actorId);
    });

    socket.on('hotel.updated', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['hotels', data.tripId] });
      notify('Hotel booking updated', actorId);
    });

    socket.on('hotel.deleted', ({ data, actorId }: { data: { id: string; tripId: string }; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['hotels', data.tripId] });
      notify('Hotel booking removed', actorId);
    });

    // ─── Packing events ─────────────────────────────────────────────────────
    socket.on('packing_item.created', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', data.tripId] });
      notify('Packing item added', actorId);
    });

    socket.on('packing_item.updated', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', data.tripId] });
      notify('Packing item updated', actorId);
    });

    socket.on('packing_item.deleted', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', data.tripId] });
      notify('Packing item removed', actorId);
    });

    socket.on('packing_list.templateLoaded', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['packing-list'] });
      notify('Packing template loaded', actorId);
    });

    // ─── Task events ────────────────────────────────────────────────────────
    socket.on('task.created', ({ actorId }: { data: unknown; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      notify('New task created', actorId);
    });

    socket.on('task.updated', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      notify('Task updated', actorId);
    });

    socket.on('task.deleted', ({ actorId }: { data: unknown; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      notify('Task deleted', actorId);
    });

    // ─── Document events ─────────────────────────────────────────────────────
    socket.on('document.uploaded', ({ data, actorId }: { data: Record<string, unknown>; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      notify('New document uploaded', actorId);
    });

    socket.on('document.deleted', ({ actorId }: { data: unknown; actorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      notify('Document removed', actorId);
    });

    // ─── Notification events ──────────────────────────────────────────────────
    socket.on('notification.created', ({ data }: { data: any }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'count'] });
      if (data && data.body) {
        setToast({ message: data.body, visible: true });
        setTimeout(() => {
          setToast((prev) =>
            prev && prev.message === data.body ? { ...prev, visible: false } : prev
          );
        }, 6000);
      }
    });

    // ─── Connection error handling ───────────────────────────────────────────
    socket.on('connect_error', (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return () => {
      socket.off('trip.created');
      socket.off('trip.updated');
      socket.off('trip.deleted');
      socket.off('schedule_event.created');
      socket.off('schedule_event.updated');
      socket.off('schedule_event.deleted');
      socket.off('schedule_event.statusChanged');
      socket.off('hotel.created');
      socket.off('hotel.updated');
      socket.off('hotel.deleted');
      socket.off('packing_item.created');
      socket.off('packing_item.updated');
      socket.off('packing_item.deleted');
      socket.off('packing_list.templateLoaded');
      socket.off('task.created');
      socket.off('task.updated');
      socket.off('task.deleted');
      socket.off('document.uploaded');
      socket.off('document.deleted');
      socket.off('notification.created');
      socket.off('connect_error');
      disconnectSocket();
    };
  }, [userId, doctorProfileId, queryClient]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
      {toast && toast.visible && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300 items-start gap-3 rounded-xl border bg-card text-card-foreground p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground">Notifikasi</h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </SocketContext.Provider>
  );
}
