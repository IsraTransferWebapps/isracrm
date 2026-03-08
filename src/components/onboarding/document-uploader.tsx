'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadOnboardingDocument } from '@/lib/onboarding/upload';
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/onboarding/schemas';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import type { DocumentType, KycDocument } from '@/types/database';

interface Props {
  clientId: string;
  documentType: DocumentType;
  label: string;
  description: string;
  required: boolean;
  existingDocument?: KycDocument | null;
  onUploadComplete: () => void;
}

export function DocumentUploader({
  clientId, documentType, label, description,
  required, existingDocument, onUploadComplete,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side validation
    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    try {
      await uploadOnboardingDocument(supabase, clientId, file, documentType);
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset the file input
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!existingDocument) return;
    try {
      // Soft-delete the document record
      await supabase.from('kyc_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', existingDocument.id);

      // Delete from storage
      if (existingDocument.file_reference) {
        await supabase.storage.from('onboarding-documents').remove([existingDocument.file_reference]);
      }

      onUploadComplete();
    } catch {
      setError('Failed to remove document');
    }
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-[#253859]">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </p>
          <p className="text-xs text-[#94A3B8] mt-0.5">{description}</p>
        </div>
        {existingDocument && (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        )}
      </div>

      {existingDocument ? (
        // Show uploaded document
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#F4F5F7]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#717D93]" />
            <span className="text-xs text-[#253859]">{existingDocument.original_filename}</span>
          </div>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-50 text-[#94A3B8] hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        // Upload zone
        <div
          className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-6 text-center hover:border-[#01A0FF] transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 mx-auto text-[#01A0FF] animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6 mx-auto text-[#94A3B8] mb-2" />
              <p className="text-xs text-[#717D93]">
                Click to upload or drag and drop
              </p>
              <p className="text-[10px] text-[#94A3B8] mt-1">
                PDF, JPG or PNG up to 10MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
