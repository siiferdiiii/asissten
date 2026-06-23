import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, disconnectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';
import { Bell, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  role?: string;
}

export function SocketProvider({ children, userId, doctorProfileId, role }: SocketProviderProps) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);
  const [popup, setPopup] = useState<{ title: string; body: string; visible: boolean } | null>(null);
  const router = useRouter();

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

        // Global Alert Modal for Doctors on new Schedule Events
        if (role === 'doctor' && data.entityType === 'schedule_event') {
          // Play HTML5 sound alert
          try {
            new Audio('/sounds/alert.mp3').play().catch(() => {});
          } catch (e) {
            console.log('Audio file play blocked or unavailable');
          }

          // Web Audio API Synthesized chime fallback to guarantee auditory cue
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass();
              const playChimeNote = (freq: number, start: number, dur: number) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.15, start);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(start);
                osc.stop(start + dur);
              };
              const now = audioCtx.currentTime;
              playChimeNote(587.33, now, 0.15); // D5
              playChimeNote(880.00, now + 0.1, 0.4); // A5
            }
          } catch (e) {
            console.log('Synthesized chime blocked or unsupported', e);
          }

          setPopup({
            title: data.title || 'PERMINTAAN PERTEMUAN BARU!',
            body: data.body,
            visible: true,
          });
        }
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
  }, [userId, doctorProfileId, queryClient, role, router]);

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

      {/* Global Doctor Pop-Up Modal for tentative schedule requests */}
      {popup && popup.visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative bg-background border border-primary/20 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 animate-pulse">
                <Bell className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground uppercase">
                🚨 {popup.title}
              </h3>
            </div>
            
            <div className="bg-muted/40 p-4 rounded-xl border border-muted text-center">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {popup.body}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setPopup(null)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setPopup(null);
                  router.push('/schedule');
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-sm cursor-pointer"
              >
                Buka Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
}
