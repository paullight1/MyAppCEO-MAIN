import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

/**
 * Identity (KYC) verification. Reads/writes `public.user_verifications`
 * (see supabase/migrations/20260705_user_verifications.sql). Submitting a record
 * flips `user_profiles.kyc_status`/`account_status` to pending via a DB trigger,
 * so `useUserStatus` reflects the change after its next refetch.
 */

export type VerificationStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'needs_more_info';

export type VerificationType = 'individual' | 'business';
export type DocumentType = 'passport' | 'national_id' | 'drivers_license';

const KYC_BUCKET = 'kyc-documents';

export interface VerificationRecord {
  id: string;
  userId: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  legalName: string;
  dateOfBirth: string | null;
  country: string;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  documentType: DocumentType | null;
  documentNumber: string | null;
  documentPath: string | null;
  businessName: string | null;
  businessRegistrationNumber: string | null;
  reviewerNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationInput {
  verificationType: VerificationType;
  legalName: string;
  dateOfBirth?: string;
  country: string;
  addressLine?: string;
  city?: string;
  postalCode?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  document?: File | null;
  businessName?: string;
  businessRegistrationNumber?: string;
}

interface VerificationRow {
  id: string;
  user_id: string;
  verification_type: VerificationType;
  status: VerificationStatus;
  legal_name: string;
  date_of_birth: string | null;
  country: string;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  document_type: DocumentType | null;
  document_number: string | null;
  document_path: string | null;
  business_name: string | null;
  business_registration_number: string | null;
  reviewer_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const mapRow = (row: VerificationRow): VerificationRecord => ({
  id: row.id,
  userId: row.user_id,
  verificationType: row.verification_type,
  status: row.status,
  legalName: row.legal_name,
  dateOfBirth: row.date_of_birth,
  country: row.country,
  addressLine: row.address_line,
  city: row.city,
  postalCode: row.postal_code,
  documentType: row.document_type,
  documentNumber: row.document_number,
  documentPath: row.document_path,
  businessName: row.business_name,
  businessRegistrationNumber: row.business_registration_number,
  reviewerNote: row.reviewer_note,
  submittedAt: row.submitted_at,
  reviewedAt: row.reviewed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const useVerification = () => {
  const { user } = useAuth();
  const [verification, setVerification] = useState<VerificationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchVerification = useCallback(async () => {
    if (!user) {
      setVerification(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle<VerificationRow>();
      if (queryError) throw queryError;
      setVerification(data ? mapRow(data) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification status.');
      setVerification(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const submitVerification = useCallback(
    async (input: VerificationInput): Promise<VerificationRecord | null> => {
      if (!user) {
        setError('Sign in again before submitting verification.');
        return null;
      }
      setSubmitting(true);
      setError(null);
      try {
        // Upload the identity document to the private KYC bucket (path only —
        // it is read back through signed URLs by reviewers, never a public URL).
        let documentPath: string | null = null;
        if (input.document) {
          const ext = input.document.name.split('.').pop() || 'bin';
          const path = `${user.id}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(KYC_BUCKET)
            .upload(path, input.document, { upsert: true, contentType: input.document.type });
          if (uploadError) throw uploadError;
          documentPath = path;
        }

        const { data, error: insertError } = await supabase
          .from('user_verifications')
          .insert({
            user_id: user.id,
            verification_type: input.verificationType,
            status: 'pending',
            legal_name: input.legalName,
            date_of_birth: input.dateOfBirth || null,
            country: input.country,
            address_line: input.addressLine || null,
            city: input.city || null,
            postal_code: input.postalCode || null,
            document_type: input.documentType || null,
            document_number: input.documentNumber || null,
            document_path: documentPath,
            business_name: input.businessName || null,
            business_registration_number: input.businessRegistrationNumber || null,
          })
          .select('*')
          .single<VerificationRow>();
        if (insertError) throw insertError;

        const record = mapRow(data);
        setVerification(record);
        return record;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to submit verification.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [user],
  );

  return {
    verification,
    isLoading,
    error,
    submitting,
    submitVerification,
    refetch: fetchVerification,
  };
};
