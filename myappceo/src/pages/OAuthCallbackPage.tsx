import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiGet } from '../lib/apiClient';
import { OAUTH_MESSAGE_TYPE, OAuthPopupMessage } from '../hooks/useOAuthPopup';
import { ErrorState } from '../components/ui';

/** How long to wait for the callback API before showing a recovery path. */
const CALLBACK_TIMEOUT_MS = 15000;

/** True when this page is running inside the in-app browser popup. */
const inPopup = () => {
  try {
    return typeof window !== 'undefined' && !!window.opener && window.opener !== window;
  } catch {
    return false;
  }
};

/** Notify the app window that opened this popup, then close it. */
const postResultAndClose = (message: OAuthPopupMessage, closeDelay = 0) => {
  try {
    window.opener?.postMessage(message, window.location.origin);
  } catch {
    /* opener may be gone; ignore */
  }
  window.setTimeout(() => {
    try {
      window.close();
    } catch {
      /* browsers may refuse to close; the app already has the result */
    }
  }, closeDelay);
};

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your connection...');
  const [timedOut, setTimedOut] = useState(false);
  const isPopup = inPopup();

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    // Guard against a hung callback API leaving the spinner up forever.
    const timeoutTimer = setTimeout(() => {
      setTimedOut(true);
      setStatus('error');
      setMessage('This is taking longer than expected.');
    }, CALLBACK_TIMEOUT_MS);

    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const platform = window.location.pathname.split('/').pop();

      const fail = (msg: string) => {
        clearTimeout(timeoutTimer);
        setStatus('error');
        setMessage(msg);
        if (isPopup) postResultAndClose({ type: OAUTH_MESSAGE_TYPE, success: false, platform, error: msg }, 2200);
      };

      if (!code || !state) {
        fail('Missing required parameters');
        return;
      }

      try {
        const response = await apiGet<{ success: boolean; error?: string }>(
          `/oauth/${platform}/callback?code=${code}&state=${state}`
        );

        if (response.success) {
          clearTimeout(timeoutTimer);
          setStatus('success');
          setMessage(`Successfully connected ${platform} account!`);
          if (isPopup) {
            postResultAndClose({ type: OAUTH_MESSAGE_TYPE, success: true, platform }, 900);
          } else {
            redirectTimer = setTimeout(() => navigate('/connections#services'), 2000);
          }
        } else {
          fail(response.error || 'Failed to connect account');
        }
      } catch (error: unknown) {
        fail(error instanceof Error ? error.message : 'Failed to connect account. Please try again.');
      }
    };

    processCallback();

    return () => {
      clearTimeout(timeoutTimer);
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [searchParams, navigate, isPopup]);

  if (timedOut) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <ErrorState
          className="w-full max-w-md"
          title="Connection timed out"
          description="We couldn't confirm your connection in time. Please head back and try connecting again."
          action={
            isPopup
              ? { label: 'Close Window', onClick: () => window.close() }
              : { label: 'Back to Connections', href: '/connections#services' }
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl p-12 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-black text-foreground mb-2">Connecting Account</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-foreground mb-2">Connected!</h2>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-foreground mb-2">Connection Failed</h2>
          </>
        )}

        <p className="text-muted-foreground font-medium">{message}</p>

        {status === 'error' && (
          <button
            onClick={() => (isPopup ? window.close() : navigate('/connections#services'))}
            className="mt-6 px-8 py-3 bg-accent text-accent-foreground rounded-2xl font-bold hover:bg-accent/90 transition-all"
          >
            {isPopup ? 'Close Window' : 'Back to Connections'}
          </button>
        )}
      </div>
    </div>
  );
};
