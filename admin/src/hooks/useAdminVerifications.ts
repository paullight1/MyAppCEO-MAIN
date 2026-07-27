import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import type {
    DocumentType,
    VerificationRecord,
    VerificationStatus,
    VerificationType,
} from './useVerification';

/**
 * Reviewer-side KYC operations for the admin queue. Reads/updates every
 * `user_verifications` row (allowed by the reviewer RLS policy) and issues a
 * short-lived signed URL for the private identity document. Deciding a case
 * writes `reviewed_by`/`reviewed_at` and, via the DB trigger, syncs the
 * submitter's `user_profiles.kyc_status`.
 */

const KYC_BUCKET = 'kyc-documents';
const SIGNED_URL_TTL_SECONDS = 120;

export interface AdminVerificationRecord extends VerificationRecord {
    reviewedBy: string | null;
    submitter: {
        fullName: string | null;
        email: string | null;
        avatarUrl: string | null;
    } | null;
}

export type ReviewDecision = Extract<VerificationStatus, 'approved' | 'rejected' | 'needs_more_info'>;

interface AdminVerificationRow {
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
    reviewed_by: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
    submitter?:
        | { full_name: string | null; email: string | null; avatar_url: string | null }
        | { full_name: string | null; email: string | null; avatar_url: string | null }[]
        | null;
}

const mapRow = (row: AdminVerificationRow): AdminVerificationRecord => {
    const submitter = Array.isArray(row.submitter) ? row.submitter[0] : row.submitter;
    return {
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
        reviewedBy: row.reviewed_by,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        submitter: submitter
            ? { fullName: submitter.full_name, email: submitter.email, avatarUrl: submitter.avatar_url }
            : null,
    };
};

export const useAdminVerifications = (initialStatus: VerificationStatus | 'all' = 'pending') => {
    const { user } = useAuth();
    const [records, setRecords] = useState<AdminVerificationRecord[]>([]);
    const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>(initialStatus);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reviewingId, setReviewingId] = useState<string | null>(null);

    const fetchRecords = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            let query = supabase
                .from('user_verifications')
                .select(
                    '*, submitter:user_profiles!user_verifications_user_id_fkey(full_name, email, avatar_url)',
                )
                .order('submitted_at', { ascending: false })
                .limit(200);
            if (statusFilter !== 'all') query = query.eq('status', statusFilter);

            const { data, error: queryError } = await query.returns<AdminVerificationRow[]>();
            if (queryError) throw queryError;
            setRecords((data ?? []).map(mapRow));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load verification submissions.');
            setRecords([]);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const reviewVerification = useCallback(
        async (id: string, decision: ReviewDecision, note?: string): Promise<boolean> => {
            if (!user) {
                setError('Sign in again to review submissions.');
                return false;
            }
            setReviewingId(id);
            setError(null);
            try {
                const { error: updateError } = await supabase
                    .from('user_verifications')
                    .update({
                        status: decision,
                        reviewer_note: note?.trim() || null,
                        reviewed_by: user.id,
                        reviewed_at: new Date().toISOString(),
                    })
                    .eq('id', id);
                if (updateError) throw updateError;

                // Reflect the decision locally: drop it from a filtered view it no
                // longer matches, otherwise update in place.
                setRecords((current) => {
                    const next = current.map((r) =>
                        r.id === id
                            ? { ...r, status: decision, reviewerNote: note?.trim() || null, reviewedBy: user.id, reviewedAt: new Date().toISOString() }
                            : r,
                    );
                    return statusFilter === 'all' ? next : next.filter((r) => r.status === statusFilter);
                });
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to record the decision.');
                return false;
            } finally {
                setReviewingId(null);
            }
        },
        [user, statusFilter],
    );

    /** Short-lived signed URL for the private identity document (or null). */
    const getDocumentUrl = useCallback(async (documentPath: string | null): Promise<string | null> => {
        if (!documentPath) return null;
        const { data, error: signError } = await supabase.storage
            .from(KYC_BUCKET)
            .createSignedUrl(documentPath, SIGNED_URL_TTL_SECONDS);
        if (signError) {
            setError(signError.message);
            return null;
        }
        return data?.signedUrl ?? null;
    }, []);

    return {
        records,
        statusFilter,
        setStatusFilter,
        isLoading,
        error,
        reviewingId,
        reviewVerification,
        getDocumentUrl,
        refetch: fetchRecords,
    };
};
