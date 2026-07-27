import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Link2,
  Loader2,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AppOnboardingWizard } from '../components/AppOnboardingWizard';
import { WorkspaceStartGrid, WorkspaceStartMode, WorkspaceStartOption } from '../components/WorkspaceStartGrid';
import { apiPost, apiUpload } from '../lib/apiClient';
import { ApiResponse } from '../../../packages/types/src';

type WorkspaceCreateResponse = {
  app?: { app_id?: string };
  appId?: string;
};

const normalizeFileName = (value: string) =>
  value
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

export const AppIntakePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showConnectWizard, setShowConnectWizard] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const selectedMode = (searchParams.get('mode') as WorkspaceStartMode | null) || 'connect';

  const setMode = (mode: WorkspaceStartMode) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('mode', mode);
    setSearchParams(nextParams, { replace: true });
  };

  const options: WorkspaceStartOption[] = useMemo(() => ([
    {
      id: 'connect',
      eyebrow: 'Existing app',
      title: 'Connect an app',
      description: 'Pull in a live app, website, or SaaS product so the workspace starts with verified public context.',
      note: 'Import path',
      icon: Link2,
    },
    {
      id: 'upload',
      eyebrow: 'Private build',
      title: 'Upload an app',
      description: 'Attach a bundle, export, or archive so we can store it in a controlled draft workspace for review.',
      note: 'Upload path',
      icon: UploadCloud,
    },
    {
      id: 'build',
      eyebrow: 'Builder request',
      title: 'Create a new app',
      description: 'Start in the builder, capture the request, and move through admin review before anything goes live.',
      note: 'Request path',
      icon: Sparkles,
    },
  ]), []);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uploadFile) {
      setUploadError('Choose a file first.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const uploadForm = new FormData();
      uploadForm.append('file', uploadFile);
      uploadForm.append('purpose', 'app_bundle');
      uploadForm.append('path', 'apps/drafts/bundles');

      const uploadResult = await apiUpload<ApiResponse<{ url: string; publicId?: string }>>('/media/upload', uploadForm);
      const uploadData = (uploadResult as any)?.data || uploadResult;
      const uploadedFileUrl = uploadData?.url || uploadData?.data?.url;

      if (!uploadedFileUrl) {
        throw new Error('The upload finished, but no file URL was returned.');
      }

      const name = uploadName.trim() || normalizeFileName(uploadFile.name) || 'Uploaded app';
      const response = await apiPost<ApiResponse<WorkspaceCreateResponse>>('/apps/managed', {
        assetType: 'mobile',
        name,
        category: 'Mobile App',
        stage: 'Private build',
        description: uploadNotes.trim() || `Uploaded ${uploadFile.name} for workspace review.`,
        websiteUrl: '',
        playStoreUrl: '',
        appStoreUrl: '',
        otherStoreUrl: '',
        repoUrl: '',
        techStack: 'Other / Unknown',
        monthlyRevenue: 0,
        users: 'No users yet',
        ownerConfirmed: true,
        dataConfirmed: true,
        termsAccepted: true,
        marketingNotificationPreference: 'skip',
        storeMetadata: {
          uploadMode: 'bundle',
          uploadedFileName: uploadFile.name,
          uploadedFileUrl,
          uploadedFileSize: uploadFile.size,
          uploadedFileType: uploadFile.type,
        },
      });

      const responseData = (response as any)?.data || response;
      const appId = responseData?.app?.app_id || responseData?.appId;
      if (!appId) {
        throw new Error('The app was created, but no app ID was returned.');
      }

      navigate(`/apps/${appId}/dashboard`, { replace: true });
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload the app file.');
    } finally {
      setUploading(false);
    }
  };

  const renderModePanel = () => {
    if (selectedMode === 'connect') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0071e3]">Connect</p>
            <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
              Open the guided import wizard.
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Use this for a live app, website, or SaaS product. The wizard pulls in store and repository context where possible, then creates the workspace in draft.
            </p>
          </div>

          <div className="space-y-3 rounded-3xl bg-[#f8fafc] p-5 dark:bg-[#111]">
            {[
              'Store URL or website context',
              'Optional repository verification',
              'Controlled workspace creation',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-[#1d1d1f]/72 dark:text-white/72">
                <CheckCircle2 className="h-4 w-4 text-[#0071e3]" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowConnectWizard(true)}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,113,227,0.18)] transition hover:bg-[#0077ed]"
          >
            Open import wizard
            <Link2 className="h-4 w-4" />
          </button>
        </div>
      );
    }

    if (selectedMode === 'upload') {
      return (
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0071e3]">Upload</p>
            <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
              Upload a package, bundle, or export.
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Attach a file and keep it in a draft workspace. We will preserve the upload and any notes for review.
            </p>
          </div>

          <div className="block">
            <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white">App file</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Accepts archives and exports such as `.zip`, `.apk`, `.ipa`, `.json`, `.csv`, or `.pdf`.
            </span>
            <label className="mt-3 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-[#1d1d1f]/12 bg-[#f8fafc] p-6 text-center transition hover:border-[#0071e3]/30 hover:bg-[#eef6ff] dark:border-white/10 dark:bg-[#111] dark:hover:bg-[#121f31]">
              <FileUp className="h-10 w-10 text-[#0071e3]" />
              <p className="mt-4 text-sm font-semibold text-[#1d1d1f] dark:text-white">
                {uploadFile ? uploadFile.name : 'Drop a file here or browse'}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The file stays attached to the workspace request.
              </p>
              <input
                type="file"
                accept=".zip,.apk,.ipa,.json,.csv,.pdf,.txt"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setUploadFile(file);
                  if (file && !uploadName.trim()) {
                    setUploadName(normalizeFileName(file.name));
                  }
                  if (file) {
                    setUploadError('');
                  }
                }}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white">App name</span>
              <input
                type="text"
                value={uploadName}
                onChange={(event) => setUploadName(event.target.value)}
                placeholder="Enter a workspace name"
                className="mt-2 h-12 w-full rounded-2xl border border-transparent bg-[#f3f6fb] px-4 text-sm font-medium text-[#1d1d1f] outline-none transition placeholder:text-[#94a3b8] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/22 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30 dark:focus:bg-white/10"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Notes</span>
              <input
                type="text"
                value={uploadNotes}
                onChange={(event) => setUploadNotes(event.target.value)}
                placeholder="Optional note for review"
                className="mt-2 h-12 w-full rounded-2xl border border-transparent bg-[#f3f6fb] px-4 text-sm font-medium text-[#1d1d1f] outline-none transition placeholder:text-[#94a3b8] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/22 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30 dark:focus:bg-white/10"
              />
            </label>
          </div>

          {uploadError && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{uploadError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,113,227,0.18)] transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {uploading ? 'Uploading' : 'Upload and create request'}
          </button>
        </form>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0071e3]">Build</p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
            Start a new app submission.
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            This is the controlled builder path. Your submission enters the admin queue and stays in draft until it is reviewed.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl bg-[#f8fafc] p-5 dark:bg-[#111]">
          {[
            'Capture the product intent in the builder.',
            'Route the submission to admin review.',
            'Create the app workspace only after approval.',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm text-[#1d1d1f]/72 dark:text-white/72">
              <CheckCircle2 className="h-4 w-4 text-[#0071e3]" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate('/ideas/new?source=onboarding')}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,113,227,0.18)] transition hover:bg-[#0077ed]"
        >
          Open submission builder
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#0071e3]">Workspace intake</p>
              <h1 className="text-4xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white sm:text-5xl lg:text-6xl">
                Choose how you want to begin.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Keep the first screen minimal. Pick one path only, then the workspace stays controlled until it has enough context to be reviewed.
              </p>
            </div>

            <WorkspaceStartGrid
              options={options}
              selectedId={selectedMode}
              onSelect={(mode) => setMode(mode)}
            />
          </div>

          <aside className="rounded-[32px] border border-border/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:bg-[#1e1e20] sm:p-8">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#1d1d1f]/42 dark:text-white/42">
                What happens next
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                Draft first, review second.
              </h2>
            </div>

            <div className="mt-8">
              <motion.div
                key={selectedMode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {renderModePanel()}
              </motion.div>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {showConnectWizard && (
          <AppOnboardingWizard onClose={() => setShowConnectWizard(false)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};
