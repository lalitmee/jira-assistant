import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  applySettings,
  bindSystemPreferenceListeners,
  clampAuditHours,
  loadSettings,
  resetSettings,
  SETTINGS_CHANGE_EVENT,
  unbindSystemPreferenceListeners,
  type Settings,
} from './settings';

type SettingsContextValue = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  resetToDefaults: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    bindSystemPreferenceListeners(() => settingsRef.current);
    return () => unbindSystemPreferenceListeners();
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Settings>).detail;
      if (detail?.version === 3) setSettings(detail);
    };
    window.addEventListener(SETTINGS_CHANGE_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGE_EVENT, handler);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      let next: Settings = { ...prev, ...patch };

      if (patch.auditMinHours != null || patch.auditMaxHours != null) {
        const audit = clampAuditHours(next.auditMinHours, next.auditMaxHours);
        next = { ...next, ...audit };
      }

      if (patch.defaultLayout && patch.defaultLayout !== 'remember') {
        next = { ...next, layout: patch.defaultLayout };
      }

      applySettings(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings((prev) => {
      const next = resetSettings(prev.layout);
      applySettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetToDefaults }),
    [settings, updateSettings, resetToDefaults],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
