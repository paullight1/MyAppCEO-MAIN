import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { useApiRunner } from './useApiRunner';

export interface AppDocument {
  id: string;
  app_id: string;
  title: string;
  file_url: string;
  file_type?: string;
  uploaded_by?: string;
  is_confidential: boolean;
  visible_to: 'all' | 'shareholders_only' | 'cofounders_only';
  uploaded_at: string;
  uploader_profile?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface AuditLogEntry {
  id: string;
  app_id: string;
  user_id?: string;
  action: string;
  details: any;
  created_at: string;
  user_profile?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export const useAppDocuments = () => {
  const { user } = useAuth();
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const getDocuments = useCallback(async (appId: string) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('app_documents')
      .select(`
        *,
        uploader_profile:user_profiles(full_name, avatar_url)
      `)
      .eq('app_id', appId)
      .order('uploaded_at', { ascending: false });

    if (fetchError) throw fetchError;
    return data as AppDocument[];
  }), [run]);

  const uploadDocument = useCallback(async (appId: string, title: string, file: File, visibleTo: string = 'all') => run(async () => {
    if (!user) throw new Error('Must be logged in');

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${appId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('app-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('app-documents')
      .getPublicUrl(fileName);

    // Create document record
    const { data, error: insertError } = await supabase
      .from('app_documents')
      .insert({
        app_id: appId,
        title,
        file_url: publicUrl,
        file_type: file.type,
        uploaded_by: user.id,
        visible_to: visibleTo,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return data as AppDocument;
  }), [user, run]);

  const deleteDocument = useCallback(async (documentId: string) => run(async () => {
    const { error: deleteError } = await supabase
      .from('app_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;
    return true;
  }), [run]);

  return {
    getDocuments,
    uploadDocument,
    deleteDocument,
    isLoading,
    error,
  };
};

export const useAppAuditLog = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const getAuditLog = useCallback(async (appId: string, limit: number = 50) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('app_audit_log')
      .select(`
        *,
        user_profile:user_profiles(full_name, avatar_url)
      `)
      .eq('app_id', appId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) throw fetchError;
    return data as AuditLogEntry[];
  }), [run]);

  return {
    getAuditLog,
    isLoading,
    error,
  };
};
