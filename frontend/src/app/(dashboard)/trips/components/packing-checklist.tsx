'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMembership } from '@/hooks/use-membership';
import { PackingList, PackingItem, ApiResponse } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, PlusIcon, Trash2, CheckSquare, Square } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const CATEGORY_LABELS: Record<string, string> = {
  clothing: '👕 Clothing',
  document: '📄 Document',
  medical: '💊 Medical',
  electronics: '🔌 Electronics',
  toiletries: '🪥 Toiletries',
  other: '📦 Other',
};

const CATEGORY_OPTIONS = ['clothing', 'document', 'medical', 'electronics', 'toiletries', 'other'];

interface PackingChecklistProps {
  tripId: string;
}

export function PackingChecklist({ tripId }: PackingChecklistProps) {
  const queryClient = useQueryClient();
  const { doctorProfileId, canMutate, role } = useMembership();

  const [addOpen, setAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [newQty, setNewQty] = useState(1);

  const { data: list, isLoading } = useQuery<PackingList>({
    queryKey: ['packing-list', tripId],
    queryFn: () =>
      apiFetch<ApiResponse<PackingList>>(
        `/trips/${tripId}/packing-list?doctorProfileId=${doctorProfileId}`,
      ).then((r) => r.data),
    enabled: !!doctorProfileId && !!tripId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isPacked }: { id: string; isPacked: boolean }) =>
      apiFetch(`/packing-items/${id}?doctorProfileId=${doctorProfileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPacked }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packing-list', tripId] }),
  });

  const addMutation = useMutation({
    mutationFn: (payload: { itemName: string; category: string; qty: number }) =>
      apiFetch(`/trips/${tripId}/packing-list/items?doctorProfileId=${doctorProfileId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', tripId] });
      setNewItemName('');
      setNewCategory('other');
      setNewQty(1);
      setAddOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/packing-items/${id}?doctorProfileId=${doctorProfileId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packing-list', tripId] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    );
  }

  const items: PackingItem[] = list?.items ?? [];
  const total = items.length;
  const packed = items.filter((i) => i.isPacked).length;
  const progressPct = total > 0 ? Math.round((packed / total) * 100) : 0;

  // Group by category
  const grouped: Record<string, PackingItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const canAddDelete = canMutate; // OA or AS
  const canToggle = canMutate || role === 'doctor'; // DR can toggle isPacked

  return (
    <div className="space-y-5">
      {/* Header + progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">Packing Checklist</h3>
            <p className="text-xs text-muted-foreground">
              {packed} / {total} items packed
            </p>
          </div>
          {canAddDelete && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="flex items-center gap-1.5">
                    <PlusIcon className="h-4 w-4" />
                    <span>Add Item</span>
                  </Button>
                }
              />
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add Packing Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Item Name</label>
                    <Input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Laptop Charger"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      min={1}
                      value={newQty}
                      onChange={(e) => setNewQty(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        addMutation.mutate({ itemName: newItemName, category: newCategory, qty: newQty })
                      }
                      disabled={!newItemName.trim() || addMutation.isPending}
                    >
                      {addMutation.isPending ? 'Adding…' : 'Add Item'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span
                className={`font-semibold ${progressPct === 100 ? 'text-green-600' : 'text-primary'}`}
              >
                {progressPct}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPct === 100 ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card">
          <Briefcase className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
          <p className="font-semibold text-sm">No Items Yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Add items individually or load from a packing template.
          </p>
        </div>
      )}

      {/* Items grouped by category */}
      {Object.entries(grouped).map(([category, categoryItems]) => (
        <div key={category} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[category] ?? category}
          </p>
          <div className="space-y-1.5">
            {categoryItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                  item.isPacked ? 'bg-muted/40 border-border/50' : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() =>
                      canToggle && toggleMutation.mutate({ id: item.id, isPacked: !item.isPacked })
                    }
                    disabled={!canToggle || toggleMutation.isPending}
                    className="shrink-0 text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {item.isPacked ? (
                      <CheckSquare className="h-4 w-4 text-green-500" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <span
                    className={`text-sm truncate ${item.isPacked ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {item.itemName}
                  </span>
                  {item.qty > 1 && (
                    <span className="text-xs text-muted-foreground shrink-0">×{item.qty}</span>
                  )}
                </div>
                {canAddDelete && (
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
