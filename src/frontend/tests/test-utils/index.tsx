import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from 'context/AuthContext';
import { ThemeProvider } from 'context/ThemeContext';
import { UserSettingsProvider } from 'context/UserSettingsContext';

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserSettingsProvider>{children}</UserSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
