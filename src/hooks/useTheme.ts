import { useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeState = {
    themePreference: ThemePreference;
    isDark: boolean;
    setThemePreference: (next: ThemePreference) => void;
    toggleTheme: () => void;
};

const THEME_STORAGE_KEY = 'theme';
const LEGACY_APPEARANCE_STORAGE_KEY = 'myappceo.appearance';
const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const THEME_PREFERENCES = new Set<ThemePreference>(['light', 'dark', 'system']);

let themePreference: ThemePreference = 'light';
let systemPrefersDark = false;
let storeVersion = 0;
let initialized = false;

const listeners = new Set<() => void>();

const isThemePreference = (value: unknown): value is ThemePreference =>
    typeof value === 'string' && THEME_PREFERENCES.has(value as ThemePreference);

const readStorageValue = (key: string) => {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeStorageValue = (key: string, value: string) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Ignore storage failures and keep the in-memory theme in sync.
    }
};

const getSystemPrefersDark = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(THEME_MEDIA_QUERY).matches;
};

const getResolvedThemeIsDark = (preference = themePreference, prefersDark = systemPrefersDark) =>
    preference === 'dark' || (preference === 'system' && prefersDark);

const applyThemeToDocument = () => {
    if (typeof document === 'undefined') return;

    document.documentElement.classList.toggle('dark', getResolvedThemeIsDark());
};

const readLegacyAppearanceTheme = (): ThemePreference | null => {
    const saved = readStorageValue(LEGACY_APPEARANCE_STORAGE_KEY);
    if (!saved) return null;

    try {
        const parsed = JSON.parse(saved) as { theme?: unknown };
        return isThemePreference(parsed.theme) ? parsed.theme : null;
    } catch {
        return null;
    }
};

const readStoredThemePreference = (): ThemePreference => {
    const savedTheme = readStorageValue(THEME_STORAGE_KEY);
    if (isThemePreference(savedTheme)) {
        return savedTheme;
    }

    const legacyTheme = readLegacyAppearanceTheme();
    if (legacyTheme) {
        writeStorageValue(THEME_STORAGE_KEY, legacyTheme);
        return legacyTheme;
    }

    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
        return 'dark';
    }

    return 'light';
};

const emit = () => {
    storeVersion += 1;
    listeners.forEach((listener) => listener());
};

const setThemePreference = (next: ThemePreference) => {
    if (themePreference === next) {
        applyThemeToDocument();
        return;
    }

    themePreference = next;
    writeStorageValue(THEME_STORAGE_KEY, next);
    applyThemeToDocument();
    emit();
};

const toggleTheme = () => {
    setThemePreference(getResolvedThemeIsDark() ? 'light' : 'dark');
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const getSnapshot = () => storeVersion;
const getServerSnapshot = () => 0;

const ensureThemeStore = () => {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;

    themePreference = readStoredThemePreference();
    systemPrefersDark = getSystemPrefersDark();
    applyThemeToDocument();

    if (typeof window.matchMedia === 'function') {
        const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
        const handleMediaChange = () => {
            const next = mediaQuery.matches;
            if (systemPrefersDark === next) return;

            systemPrefersDark = next;
            if (themePreference === 'system') {
                applyThemeToDocument();
                emit();
            }
        };

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleMediaChange);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(handleMediaChange);
        }
    }

    window.addEventListener('storage', (event) => {
        if (event.key !== THEME_STORAGE_KEY && event.key !== LEGACY_APPEARANCE_STORAGE_KEY) {
            return;
        }

        const nextPreference = readStoredThemePreference();
        if (nextPreference === themePreference) {
            return;
        }

        themePreference = nextPreference;
        applyThemeToDocument();
        emit();
    });
};

ensureThemeStore();

export function useTheme(): ThemeState {
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    return {
        themePreference,
        isDark: getResolvedThemeIsDark(),
        setThemePreference,
        toggleTheme,
    };
}
