"use client"

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMembership } from '@/hooks/use-membership';
import { Document, ApiResponse } from '@/types/api.types';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  File,
  ImageIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface TripDocumentsProps {
  tripId: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-sky-400" />;
  return <File className="h-5 w-5 text-orange-400" />;
}

interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  expiresAt: string;
}

export function TripDocuments({ tripId }: TripDocumentsProps) {
  const { doctorProfileId, role } = useMembership();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Determine if user can upload/delete (owner_assistant or assistant)
  const canUpload = role === 'owner_assistant' || role === 'assistant';

  const { data: docsRes, isLoading } = useQuery<ApiResponse<Document[]>>({
    queryKey: ['documents', 'trip', tripId],
    queryFn: () =>
      apiFetch<ApiResponse<Document[]>>(
        `/documents?doctorProfileId=${doctorProfileId}&entityType=trip&entityId=${tripId}`,
      ),
    enabled: !!tripId && !!doctorProfileId,
  });

  const documents = docsRes?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (docId: string) =>
      apiFetch(`/documents/${docId}?doctorProfileId=${doctorProfileId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', 'trip', tripId] });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Tipe file tidak didukung. Hanya PDF, JPG, PNG, dan HEIC.');
      return;
    }
    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError('Ukuran file melebihi batas 10 MB.');
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Get presigned URL
      const presigned = await apiFetch<ApiResponse<PresignedUrlResponse>>(
        '/documents/presigned-url',
        {
          method: 'POST',
          body: JSON.stringify({
            doctorProfileId,
            entityType: 'trip',
            entityId: tripId,
            fileName: file.name,
            fileType: file.type,
          }),
        },
      );

      const { uploadUrl, key } = presigned.data;

      // Step 2: Upload directly to Cloudflare R2 via presigned URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload ke storage gagal.');
      }

      // Step 3: Confirm upload to backend (save metadata)
      await apiFetch('/documents', {
        method: 'POST',
        body: JSON.stringify({
          doctorProfileId,
          entityType: 'trip',
          entityId: tripId,
          key,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      void queryClient.invalidateQueries({ queryKey: ['documents', 'trip', tripId] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload gagal.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      await deleteMutation.mutateAsync(docId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Travel Documents</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {canUpload
              ? 'Unggah dokumen perjalanan (PDF/JPG/PNG/HEIC, maks. 10 MB)'
              : 'Anda hanya bisa melihat dan mengunduh dokumen'}
          </p>
        </div>
        {canUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic"
              className="hidden"
              id="doc-upload-input"
              onChange={handleFileChange}
              disabled={isUploading || !doctorProfileId}
            />
            <Button
              size="sm"
              className="flex items-center gap-1.5"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{isUploading ? 'Mengunggah...' : 'Upload Dokumen'}</span>
            </Button>
          </>
        )}
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Document List */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card">
          <FileText className="h-10 w-10 text-muted-foreground mb-3 opacity-30" />
          <p className="font-semibold text-sm">Belum Ada Dokumen</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {canUpload
              ? 'Klik "Upload Dokumen" untuk menambahkan tiket, visa, atau dokumen penting lainnya.'
              : 'Belum ada dokumen yang diunggah untuk perjalanan ini.'}
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card overflow-hidden">
          {documents.map((doc) => {
            const filename = doc.fileUrl.split('/').pop() ?? doc.fileUrl;
            const isDeleting = deletingId === doc.id;

            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {getFileIcon(doc.fileType)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.fileSize)} · {doc.fileType.split('/').pop()?.toUpperCase()} ·{' '}
                    {doc.uploadedBy?.name ?? 'Unknown'} ·{' '}
                    {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    aria-label="Download dokumen"
                  >
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7" type="button">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>

                  {canUpload && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isDeleting}
                      onClick={() => void handleDelete(doc.id)}
                      aria-label="Hapus dokumen"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
