"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocketContext } from '@/providers/socket-provider';
import { Notification, ApiResponse } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Bell, BellDot, Check, CheckCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

export function NotificationInbox() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();

  // Fetch notifications
  const { data: notifRes } = useQuery<ApiResponse<Notification[]>>({
    queryKey: ['notifications'],
    queryFn: () =>
      apiFetch<ApiResponse<Notification[]>>('/notifications?limit=30'),
    refetchInterval: 60_000,
  });

  // Fetch unread count separately for the badge
  const { data: countRes } = useQuery<ApiResponse<{ count: number }>>({
    queryKey: ['notifications', 'count'],
    queryFn: () =>
      apiFetch<ApiResponse<{ count: number }>>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });

  const notifications = notifRes?.data ?? [];
  const unreadCount = countRes?.data?.count ?? 0;

  // Realtime: listen for new notifications
  const refreshNotifications = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'count'] });
  }, [queryClient]);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification.created', refreshNotifications);
    return () => {
      socket.off('notification.created', refreshNotifications);
    };
  }, [socket, refreshNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Mark single as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'count'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () =>
      apiFetch('/notifications/mark-all-read', { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'count'] });
    },
  });

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <Button
        id="notification-inbox-btn"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative"
        aria-label="Notifikasi"
      >
        {hasUnread ? (
          <BellDot className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5 text-muted-foreground" />
        )}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'w-80 rounded-xl border bg-popover text-popover-foreground shadow-xl',
            'animate-in fade-in-0 slide-in-from-top-2 duration-200',
          )}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Notifikasi</span>
              {hasUnread && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Tandai semua dibaca"
                  disabled={markAllReadMutation.isPending}
                  onClick={() => markAllReadMutation.mutate()}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell className="h-8 w-8 text-muted-foreground mb-2 opacity-30" />
                <p className="text-sm font-medium text-muted-foreground">Tidak ada notifikasi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aktivitas tim akan muncul di sini
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 cursor-pointer',
                      !notif.isRead && 'bg-primary/5',
                    )}
                    onClick={() => {
                      if (!notif.isRead) {
                        markAsReadMutation.mutate(notif.id);
                      }
                    }}
                  >
                    {/* Unread indicator */}
                    <div className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                      {!notif.isRead ? (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-transparent" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm leading-snug', !notif.isRead && 'font-semibold')}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>

                    {/* Mark as read button */}
                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        title="Tandai dibaca"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReadMutation.mutate(notif.id);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">
                Menampilkan {notifications.length} notifikasi terbaru
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
