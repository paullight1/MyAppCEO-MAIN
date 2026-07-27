import React, { useState } from 'react';
import { FileText, Upload, Download, Trash2, Loader2, Plus, X, File, Lock, Globe, Users } from 'lucide-react';
import { useAppDocuments, AppDocument } from '../hooks/useAppDocuments';
import { validateUrl } from '../utils/security';

interface DocumentManagerProps {
  appId: string;
  canUpload: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ appId, canUpload }) => {
  const { getDocuments, uploadDocument, deleteDocument } = useAppDocuments();
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  React.useEffect(() => {
    loadDocuments();
  }, [appId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const result = await getDocuments(appId);
      if (result.success && result.data) setDocuments(result.data);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadDocument(appId, file.name, file, 'all');
      loadDocuments();
      setShowUploadModal(false);
    } catch (err: any) {
      console.error('Failed to upload document:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(docId);
      loadDocuments();
    } catch (err: any) {
      console.error('Failed to delete document:', err);
    }
  };

  const getVisibilityIcon = (visibleTo: string) => {
    switch (visibleTo) {
      case 'all': return <Globe size={12} className="text-[#1d1d1f]/30 dark:text-white/30" />;
      case 'shareholders_only': return <Users size={12} className="text-emerald-500" />;
      case 'cofounders_only': return <Lock size={12} className="text-amber-500" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-[#0071e3] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
          <FileText size={16} className="text-[#0071e3]" />
          Documents ({documents.length})
        </h3>
        {canUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-1.5 bg-[#0071e3] text-white rounded-lg font-bold text-xs hover:bg-[#0077ed] transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Upload
          </button>
        )}
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={32} className="mx-auto mb-2 text-[#1d1d1f]/15 dark:text-white/15" />
          <p className="text-sm text-[#1d1d1f]/40 dark:text-white/40">No documents yet</p>
          {canUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-3 text-xs font-bold text-[#0071e3] hover:underline"
            >
              Upload first document
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-lg">
              <div className="w-9 h-9 rounded-lg bg-[#f5f5f7] dark:bg-[#111] flex items-center justify-center">
                <File size={16} className="text-[#1d1d1f]/30 dark:text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1d1d1f] dark:text-white truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {getVisibilityIcon(doc.visible_to)}
                  <span className="text-[10px] text-[#1d1d1f]/30 dark:text-white/30">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {validateUrl(doc.file_url) ? (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-colors"
                  >
                    <Download size={14} className="text-[#1d1d1f]/40 dark:text-white/40" />
                  </a>
                ) : null}
                {canUpload && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#1d1d1f]/30 dark:text-white/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-colors">
                <X size={16} className="text-[#1d1d1f]/40 dark:text-white/40" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#1d1d1f]/20 dark:border-white/20 rounded-xl cursor-pointer hover:border-[#0071e3]/30 transition-colors">
                <Upload size={24} className="text-[#1d1d1f]/30 dark:text-white/30 mb-2" />
                <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">Click to upload or drag and drop</p>
                <p className="text-xs text-[#1d1d1f]/30 dark:text-white/30 mt-1">PDF, DOCX, Images</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>

              {uploading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 size={16} className="text-[#0071e3] animate-spin" />
                  <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">Uploading...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
