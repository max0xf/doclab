import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { UserSettingsProvider } from './context/UserSettingsContext';
import { DraftChangeProvider } from './context/DraftChangeContext';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import ViewLoadingFallback from './components/ViewLoadingFallback';
import { Urls } from './types';

// Lazy-loaded views for code splitting
const Dashboard = React.lazy(() => import('./views/Dashboard'));
const Spaces = React.lazy(() => import('./views/Spaces'));
const SpaceConfiguration = React.lazy(() => import('./views/SpaceConfiguration'));
const DocumentEditor = React.lazy(() => import('./views/DocumentEditor'));
const Search = React.lazy(() => import('./views/Search'));
const UserManagement = React.lazy(() => import('./views/UserManagement'));
const Profile = React.lazy(() => import('./views/Profile'));
const Configuration = React.lazy(() => import('./views/Configuration'));
const ChangeHistory = React.lazy(() => import('./views/ChangeHistory'));
const PendingChanges = React.lazy(() => import('./views/PendingChanges'));
const JiraIntegration = React.lazy(() => import('./views/JiraIntegration'));

function getInitialView(): string {
  const hash = window.location.hash.slice(1);
  const [pageName] = hash.split('?');
  return pageName || Urls.Dashboard;
}

function AppContent() {
  const [activeView, setActiveView] = React.useState(getInitialView);
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      const [pageName] = hash.split('?');
      if (pageName) {
        setActiveView(pageName);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const navigate = (view: string) => {
    window.location.hash = view;
    setActiveView(view);
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderView = () => {
    return (
      <React.Suspense fallback={<ViewLoadingFallback />}>
        {activeView === Urls.Dashboard && <Dashboard navigate={navigate} />}
        {activeView === Urls.Spaces && <Spaces navigate={navigate} />}
        {activeView === Urls.SpaceConfiguration && <SpaceConfiguration />}
        {activeView.startsWith(Urls.DocumentEditor) && <DocumentEditor />}
        {activeView === Urls.Search && <Search />}
        {activeView === Urls.UserManagement && <UserManagement />}
        {activeView === Urls.Profile && <Profile />}
        {activeView === Urls.Configuration && <Configuration />}
        {activeView === Urls.ChangeHistory && <ChangeHistory />}
        {activeView === Urls.PendingChanges && <PendingChanges />}
        {activeView === Urls.JiraIntegration && <JiraIntegration />}
      </React.Suspense>
    );
  };

  return <Layout navigate={navigate}>{renderView()}</Layout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserSettingsProvider>
          <DraftChangeProvider>
            <AppContent />
          </DraftChangeProvider>
        </UserSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
