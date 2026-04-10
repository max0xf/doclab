import React, { createContext, useContext, useState } from 'react';
import { UserSettings, Theme } from '../types';

interface UserSettingsContextValue {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
}

const defaultSettings: UserSettings = {
  theme: Theme.Light,
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  const updateSettings = (patch: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  return (
    <UserSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) {
    throw new Error('useUserSettings must be used within UserSettingsProvider');
  }
  return ctx;
}
