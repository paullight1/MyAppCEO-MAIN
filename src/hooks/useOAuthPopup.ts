import { useCallback, useEffect, useRef } from 'react';

/**
 * In-app browser OAuth flow.
 *
 * Opens the provider's authorize URL in a centered popup window (an "in-app
 * browser") instead of navigating the whole SPA away. The popup lands on our
 * own `/oauth-callback/:platform` route, which posts the result back to this
 * window via postMessage and closes itself. We resolve with that result.
 *
 * Real OAuth providers (Google, Meta, Stripe, X) send `X-Frame-Options: DENY`,
 * so a true <iframe> embed is impossible — a popup window is the correct,
 * working implementation of an in-app connect browser.
 */

export const OAUTH_MESSAGE_TYPE = 'myappceo:oauth-result';

export interface OAuthPopupResult {
    success: boolean;
    platform?: string;
    /** Machine-readable error code, e.g. 'popup_blocked'. */
    error?: string;
    /** User closed the window before finishing. */
    cancelled?: boolean;
}

export interface OAuthPopupMessage {
    type: typeof OAUTH_MESSAGE_TYPE;
    success: boolean;
    platform?: string;
    error?: string;
}

const POPUP_W = 520;
const POPUP_H = 680;

export function useOAuthPopup() {
    const cleanupRef = useRef<(() => void) | null>(null);

    // Tear down any dangling listeners/timers if the component unmounts mid-flow.
    useEffect(() => () => cleanupRef.current?.(), []);

    const open = useCallback(
        (url: string, opts?: { name?: string }): Promise<OAuthPopupResult> =>
            new Promise((resolve) => {
                // Center on the active monitor (dual-screen aware).
                const dualLeft = window.screenLeft ?? window.screenX ?? 0;
                const dualTop = window.screenTop ?? window.screenY ?? 0;
                const outerW = window.innerWidth || document.documentElement.clientWidth || screen.width;
                const outerH = window.innerHeight || document.documentElement.clientHeight || screen.height;
                const left = Math.max(0, dualLeft + (outerW - POPUP_W) / 2);
                const top = Math.max(0, dualTop + (outerH - POPUP_H) / 2);

                const popup = window.open(
                    url,
                    opts?.name || 'myappceo_oauth',
                    `popup=yes,width=${POPUP_W},height=${POPUP_H},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`,
                );

                // Popup blocked by the browser — let the caller fall back to a redirect.
                if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                    resolve({ success: false, error: 'popup_blocked' });
                    return;
                }

                try {
                    popup.focus();
                } catch {
                    /* cross-origin focus can throw; harmless */
                }

                let settled = false;

                const cleanup = () => {
                    window.clearInterval(poll);
                    window.removeEventListener('message', onMessage);
                    cleanupRef.current = null;
                };

                const finish = (result: OAuthPopupResult) => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    resolve(result);
                };

                const onMessage = (event: MessageEvent) => {
                    // Only trust messages from our own origin (the callback route).
                    if (event.origin !== window.location.origin) return;
                    const data = event.data as OAuthPopupMessage | undefined;
                    if (!data || data.type !== OAUTH_MESSAGE_TYPE) return;
                    finish({ success: !!data.success, platform: data.platform, error: data.error });
                    try {
                        popup.close();
                    } catch {
                        /* noop */
                    }
                };

                // Detect the user closing the window without finishing.
                const poll = window.setInterval(() => {
                    if (popup.closed) finish({ success: false, cancelled: true });
                }, 500);

                cleanupRef.current = cleanup;
                window.addEventListener('message', onMessage);
            }),
        [],
    );

    return { open };
}
