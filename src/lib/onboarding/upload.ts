import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocumentType } from '@/types/database';
import { ACCEPTED_DOCUMENT_TYPES, MAX_FILE_SIZE } from './schemas';

/**
 * Upload a document to Supabase Storage and create a kyc_documents record.
 */
export async function uploadOnboardingDocument(
  supabase: SupabaseClient,
  clientId: string,
  file: File,
  documentType: DocumentType
): Promise<{ fileReference: string; documentId: string }> {
  // Validate file
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type as typeof ACCEPTED_DOCUMENT_TYPES[number])) {
    throw new Error('Invalid file type. Accepted: PDF, JPG, PNG');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 10MB');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const timestamp = Date.now();
  const filePath = `${clientId}/documents/${documentType}_${timestamp}.${ext}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('onboarding-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Create kyc_documents record
  const { data: doc, error: docError } = await supabase
    .from('kyc_documents')
    .insert({
      client_id: clientId,
      document_type: documentType,
      file_reference: filePath,
      original_filename: file.name,
      status: 'pending_review',
    })
    .select('id')
    .single();

  if (docError) {
    // Clean up the uploaded file if record creation fails
    await supabase.storage.from('onboarding-documents').remove([filePath]);
    throw new Error(`Failed to record document: ${docError.message}`);
  }

  return { fileReference: filePath, documentId: doc.id };
}

/**
 * Delete a document from storage and soft-delete the kyc_documents record.
 */
export async function deleteOnboardingDocument(
  supabase: SupabaseClient,
  documentId: string,
  fileReference: string
) {
  // Soft-delete the record
  const { error: docError } = await supabase
    .from('kyc_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId);

  if (docError) throw new Error(`Failed to delete record: ${docError.message}`);

  // Remove from storage
  await supabase.storage.from('onboarding-documents').remove([fileReference]);
}
