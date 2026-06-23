'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMembership } from '@/hooks/use-membership';
import { Task, TaskStatus, ApiResponse } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TaskForm } from './components/task-form';
import {
  PlusIcon,
  Trash2,
  Pencil,
  CheckSquare,
  LayoutList,
  Columns3,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUSES: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'open', label: 'Open', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { key: 'done', label: 'Done', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
};

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (task.status === 'done') return false;
  return new Date(task.dueDate) < new Date();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface TaskCardProps {
  task: Task;
  canMutate: boolean;
  doctorProfileId: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function TaskCard({ task, canMutate, doctorProfileId, onEdit, onDelete }: TaskCardProps) {
  const overdue = isOverdue(task);

  return (
    <Card className={cn('group transition-all duration-150 hover:shadow-md', overdue && 'border-red-500/40')}>
      <CardContent className="p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className={cn('font-semibold text-sm truncate', task.status === 'done' && 'line-through text-muted-foreground')}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}
          </div>
          {canMutate && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(task)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* OVERDUE label — bright red, FR-17 */}
          {overdue && (
            <Badge className="bg-red-600 text-white border-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 animate-pulse">
              OVERDUE
            </Badge>
          )}
          <Badge variant="outline" className={cn('text-xs capitalize', PRIORITY_COLORS[task.priority])}>
            {task.priority}
          </Badge>
          {task.dueDate && (
            <span className={cn('flex items-center gap-1 text-xs text-muted-foreground', overdue && 'text-red-500 font-medium')}>
              <CalendarClock className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.assignedTo && (
            <span className="text-xs text-muted-foreground ml-auto">
              → {task.assignedTo.name}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { doctorProfileId, canMutate } = useMembership();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const { data, isLoading } = useQuery<{ data: Task[] }>({
    queryKey: ['tasks', doctorProfileId, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams({ doctorProfileId: doctorProfileId! });
      if (filterStatus !== 'all') params.set('status', filterStatus);
      return apiFetch<ApiResponse<Task[]>>(`/tasks?${params.toString()}`).then((r) => r);
    },
    enabled: !!doctorProfileId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/tasks/${id}?doctorProfileId=${doctorProfileId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeleteTask(null);
    },
  });

  const tasks = data?.data ?? [];

  const tasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  const allFiltered = filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Task Board</h1>
          <p className="text-sm text-muted-foreground">
            Manage tasks across your doctor profile. Overdue tasks are flagged in red.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border overflow-hidden">
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
                viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
              onClick={() => setViewMode('kanban')}
            >
              <Columns3 className="h-4 w-4" />
              <span>Kanban</span>
            </button>
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-4 w-4" />
              <span>List</span>
            </button>
          </div>

          {canMutate && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger
                render={
                  <Button className="flex items-center gap-1.5">
                    <PlusIcon className="h-4 w-4" />
                    <span>New Task</span>
                  </Button>
                }
              />
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <TaskForm
                  doctorProfileId={doctorProfileId!}
                  onSuccess={() => setAddOpen(false)}
                  onCancel={() => setAddOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Status Filter (for list view) */}
      {viewMode === 'list' && (
        <div className="flex gap-2 flex-wrap">
          {[{ key: 'all', label: 'All' }, ...STATUSES.map((s) => ({ key: s.key, label: s.label }))].map(
            (s) => (
              <button
                key={s.key}
                onClick={() => setFilterStatus(s.key as TaskStatus | 'all')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  filterStatus === s.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {s.label}
              </button>
            ),
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {/* KANBAN VIEW */}
      {!isLoading && viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STATUSES.map((col) => (
            <div key={col.key} className="space-y-3">
              {/* Column header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('text-xs', col.color)}>
                    {col.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {tasksByStatus(col.key).length}
                  </span>
                </div>
              </div>

              {/* Column body */}
              <div className="space-y-2.5 min-h-[120px]">
                {tasksByStatus(col.key).length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No tasks here
                  </div>
                ) : (
                  tasksByStatus(col.key).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canMutate={canMutate}
                      doctorProfileId={doctorProfileId!}
                      onEdit={setEditTask}
                      onDelete={setDeleteTask}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIST VIEW */}
      {!isLoading && viewMode === 'list' && (
        <div className="space-y-2.5">
          {allFiltered.length === 0 && (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-sm">No Tasks Found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filterStatus !== 'all'
                  ? `No tasks with status "${filterStatus}".`
                  : 'Create your first task.'}
              </p>
            </div>
          )}
          {allFiltered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canMutate={canMutate}
              doctorProfileId={doctorProfileId!}
              onEdit={setEditTask}
              onDelete={setDeleteTask}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editTask && (
            <TaskForm
              doctorProfileId={doctorProfileId!}
              task={editTask}
              onSuccess={() => setEditTask(null)}
              onCancel={() => setEditTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTask} onOpenChange={(o) => !o && setDeleteTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-500">Delete Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">&ldquo;{deleteTask?.title}&rdquo;</span>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTask(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteTask && deleteMutation.mutate(deleteTask.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
