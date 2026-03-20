import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import Login from './pages/Login/Login';
import { useAppSelector } from './hooks/redux';
import { AppLayout } from './components/AppLayout';

const Casinos = lazy(() => import('./pages/Casinos/Casinos'));
const CasinoCompare = lazy(() => import('./pages/CasinoCompare/CasinoCompare'));
const CasinoProfileView = lazy(() => import('./pages/CasinoProfile/CasinoProfileView'));
const CasinoProfile = lazy(() => import('./pages/CasinoProfile/CasinoProfile'));
const Bonuses = lazy(() => import('./pages/Bonuses/Bonuses'));
const Payments = lazy(() => import('./pages/Payments/Payments'));
const Promos = lazy(() => import('./pages/Promos/Promos'));
const Accounts = lazy(() => import('./pages/Accounts/Accounts'));
const TransactionHistory = lazy(() => import('./pages/Accounts/TransactionHistory'));
const Emails = lazy(() => import('./pages/Emails/Emails'));
const ImapAccounts = lazy(() => import('./pages/Emails/ImapAccounts'));
const ProfileFields = lazy(() => import('./pages/ProfileFields/ProfileFields'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings/ProfileSettings'));
const ProfileSettingsAnalytics = lazy(() => import('./pages/ProfileSettingsAnalytics/ProfileSettingsAnalytics'));
const EmailAnalytics = lazy(() => import('./pages/EmailAnalytics/EmailAnalytics'));
const ProviderAnalytics = lazy(() => import('./pages/ProviderAnalytics/ProviderAnalytics'));
const EmailTopics = lazy(() => import('./pages/EmailTopics/EmailTopics'));
const Users = lazy(() => import('./pages/Users/Users'));
const Directories = lazy(() => import('./pages/Directories/Directories'));
const ScreenshotsGallery = lazy(() => import('./pages/ScreenshotsGallery/ScreenshotsGallery'));
const Chat = lazy(() => import('./pages/Chat/Chat'));
const ChatModelsSettings = lazy(() => import('./pages/ChatModels/ChatModelsSettings'));
const AiProposals = lazy(() => import('./pages/AiProposals/AiProposals'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <Spin size="large" />
  </div>
);

function App() {
  const { token } = useAppSelector((state) => state.auth);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        <Route
          path="/"
          element={token ? <AppLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<Navigate to="/casinos" replace />} />
          <Route path="casinos" element={<Casinos />} />
          <Route path="casinos/compare" element={<CasinoCompare />} />
          <Route path="casinos/:id" element={<CasinoProfileView />} />
          <Route path="casinos/:id/edit" element={<CasinoProfile />} />

          <Route path="bonuses" element={<Bonuses />} />
          <Route path="payments" element={<Payments />} />
          <Route path="promos" element={<Promos />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/transactions" element={<TransactionHistory />} />
          <Route path="emails" element={<Emails />} />
          <Route path="emails/imap-accounts" element={<ImapAccounts />} />
          <Route path="profile-fields" element={<ProfileFields />} />
          <Route path="profile-settings" element={<ProfileSettings />} />
          <Route path="profile-settings-analytics" element={<ProfileSettingsAnalytics />} />
          <Route path="email-analytics" element={<EmailAnalytics />} />
          <Route path="provider-analytics" element={<ProviderAnalytics />} />

          <Route path="email-topics" element={<EmailTopics />} />
          <Route path="users" element={<Users />} />
          <Route path="directories" element={<Directories />} />
          <Route path="screenshots" element={<ScreenshotsGallery />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat-models" element={<ChatModelsSettings />} />
          <Route path="ai-proposals" element={<AiProposals />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
