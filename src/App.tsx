import { Routes, Route, Navigate } from 'react-router-dom';
import Casinos from './pages/Casinos/Casinos';

import Emails from './pages/Emails/Emails';
import ImapAccounts from './pages/Emails/ImapAccounts';
import Bonuses from './pages/Bonuses/Bonuses';
import Payments from './pages/Payments/Payments';
import Login from './pages/Login/Login';
import { useAppSelector } from './hooks/redux';
import { AppLayout } from './components/AppLayout';
import CasinoProfile from './pages/CasinoProfile/CasinoProfile';
import CasinoProfileView from './pages/CasinoProfile/CasinoProfileView';
import ProfileFields from './pages/ProfileFields/ProfileFields';
import ProfileSettings from './pages/ProfileSettings/ProfileSettings';
import ProfileSettingsAnalytics from './pages/ProfileSettingsAnalytics/ProfileSettingsAnalytics';
import CasinoCompare from './pages/CasinoCompare/CasinoCompare';
import Users from './pages/Users/Users';
import Accounts from './pages/Accounts/Accounts';
import ScreenshotsGallery from './pages/ScreenshotsGallery/ScreenshotsGallery';

import EmailAnalytics from './pages/EmailAnalytics/EmailAnalytics';

function App() {
  const { token } = useAppSelector((state) => state.auth);

  return (
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
        <Route path="accounts" element={<Accounts />} />
        <Route path="emails" element={<Emails />} />
        <Route path="emails/imap-accounts" element={<ImapAccounts />} />
        <Route path="profile-fields" element={<ProfileFields />} />
        <Route path="profile-settings" element={<ProfileSettings />} />
        <Route path="profile-settings-analytics" element={<ProfileSettingsAnalytics />} />
        <Route path="email-analytics" element={<EmailAnalytics />} />

        <Route path="users" element={<Users />} />
        <Route path="screenshots" element={<ScreenshotsGallery />} />
      </Route>
    </Routes>
  );
}

export default App;
