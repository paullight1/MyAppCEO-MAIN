import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { useApiRunner } from './useApiRunner';

export interface LicenseType {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  country: string;
  issuing_authority?: string;
  is_featured: boolean;
  requirements?: string;
  estimated_duration?: string;
  estimated_cost?: string;
  is_active: boolean;
}

export interface UserLicenseApplication {
  id: string;
  user_id: string;
  license_type_id: string;
  country: string;
  status: 'draft' | 'submitted' | 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'expired';
  application_data: any;
  submitted_at?: string;
  reviewed_at?: string;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
  license_type?: LicenseType;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

export const useLegalLicenses = () => {
  const { user } = useAuth();
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const ensureApplicationEditable = (status?: string) => {
    if (status && !['draft', 'rejected'].includes(status)) {
      throw new Error('Only draft or rejected applications can be edited.');
    }
  };

  const getFeaturedLicenses = useCallback(async (country: string = 'NG') => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('license_types')
      .select('*')
      .eq('country', country)
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (fetchError) throw fetchError;
    return { success: true, data: data as LicenseType[] };
  }), [user, run]);

  const getLicensesByCategory = useCallback(async (category: string, country: string = 'NG') => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('license_types')
      .select('*')
      .eq('category', category)
      .eq('country', country)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (fetchError) throw fetchError;
    return { success: true, data: data as LicenseType[] };
  }), [user, run]);

  const getAllLicenses = useCallback(async (country: string = 'NG', category?: string) => run(async () => {
    let query = supabase
      .from('license_types')
      .select('*')
      .eq('country', country)
      .eq('is_active', true);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error: fetchError } = await query.order('is_featured', { ascending: false }).order('name', { ascending: true });

    if (fetchError) throw fetchError;
    return { success: true, data: data as LicenseType[] };
  }), [run]);

  const getApplication = useCallback(async (applicationId: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const { data, error: fetchError } = await supabase
      .from('user_license_applications')
      .select(`
        *,
        license_type:license_types(*)
      `)
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;
    return { success: true, data };
  }), [user, run]);

  const getMyApplications = useCallback(async () => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const { data, error: fetchError } = await supabase
      .from('user_license_applications')
      .select(`
        *,
        license_type:license_types(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    return { success: true, data: data as UserLicenseApplication[] };
  }), [user, run]);

  const createApplication = useCallback(async (licenseTypeId: string, country: string, applicationData: any) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const { data: licenseType, error: licenseError } = await supabase
      .from('license_types')
      .select('id,country,is_active')
      .eq('id', licenseTypeId)
      .eq('country', country)
      .eq('is_active', true)
      .single();
    if (licenseError || !licenseType) throw licenseError || new Error('License type is not available for this country.');

    const { data, error: insertError } = await supabase
      .from('user_license_applications')
      .insert({
        user_id: user.id,
        license_type_id: licenseTypeId,
        country,
        status: 'draft',
        application_data: applicationData,
      })
      .select(`
        *,
        license_type:license_types(*)
      `)
      .single();

    if (insertError) throw insertError;
    return { success: true, data };
  }), [user, run]);

  const submitApplication = useCallback(async (applicationId: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const { data: existing, error: existingError } = await supabase
      .from('user_license_applications')
      .select('status,application_data')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();
    if (existingError) throw existingError;
    ensureApplicationEditable(existing.status);
    const personalInfo = existing.application_data?.personalInfo || {};
    const businessInfo = existing.application_data?.businessInfo || {};
    if (!personalInfo.fullName || !personalInfo.email || !personalInfo.phone || !businessInfo.businessName || !businessInfo.businessAddress) {
      throw new Error('Complete required personal and business fields before submitting.');
    }

    const { data, error: updateError } = await supabase
      .from('user_license_applications')
      .update({
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return { success: true, data };
  }), [user, run]);

  const updateApplication = useCallback(async (applicationId: string, updates: Partial<UserLicenseApplication>) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const { data: existing, error: existingError } = await supabase
      .from('user_license_applications')
      .select('status')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();
    if (existingError) throw existingError;
    ensureApplicationEditable(existing.status);

    const { data, error: updateError } = await supabase
      .from('user_license_applications')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return { success: true, data };
  }), [user, run]);

  const getApplicationDocuments = useCallback(async (applicationId: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const { data: application, error: appError } = await supabase
      .from('user_license_applications')
      .select('id')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();
    if (appError || !application) throw appError || new Error('Application not found.');

    const { data, error: fetchError } = await supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: false });

    if (fetchError) throw fetchError;
    return { success: true, data: data as ApplicationDocument[] };
  }), [run]);

  const uploadDocument = useCallback(async (applicationId: string, documentType: string, file: File) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    const maxBytes = 10 * 1024 * 1024;
    if (!documentType.trim()) throw new Error('Document type is required.');
    if (!allowedTypes.includes(file.type)) throw new Error('Upload a PDF, PNG, JPG, or WebP document.');
    if (file.size > maxBytes) throw new Error('Document upload must be 10MB or smaller.');

    const { data: application, error: appError } = await supabase
      .from('user_license_applications')
      .select('status')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();
    if (appError) throw appError;
    ensureApplicationEditable(application.status);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${applicationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('license-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data, error: insertError } = await supabase
      .from('application_documents')
      .insert({
        application_id: applicationId,
        document_type: documentType,
        file_url: fileName,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return { success: true, data };
  }), [user, run]);

  return {
    getFeaturedLicenses,
    getLicensesByCategory,
    getAllLicenses,
    getApplication,
    getMyApplications,
    createApplication,
    submitApplication,
    updateApplication,
    getApplicationDocuments,
    uploadDocument,
    isLoading,
    error,
  };
};
