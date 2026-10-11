import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { ProtectedRoute, PublicOnlyRoute, AdminRoute, FullScreenLoader } from './components/RouteGuards';
import { InstallPrompt, UpdatePrompt } from './components/PwaPrompts';

// Public
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Activities = lazy(() => import('./pages/Activities'));
const ActivityDetail = lazy(() => import('./pages/ActivityDetail'));
const Communities = lazy(() => import('./pages/Communities'));
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Guidelines = lazy(() => import('./pages/Guidelines'));

// Authenticated
const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const Create = lazy(() => import('./pages/Create'));
const Room = lazy(() => import('./pages/Room'));
const MyActivity = lazy(() => import('./pages/MyActivity'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'));
const Settings = lazy(() => import('./pages/Settings'));
const Saved = lazy(() => import('./pages/Saved'));
const BlockedUsers = lazy(() => import('./pages/BlockedUsers'));
const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  return (
    <>
      <UpdatePrompt />
      <InstallPrompt />
      <Suspense fallback={<FullScreenLoader label="Opening…" />}>
        <Routes>
          <Route
            element={
              <AppLayout>
                <Suspense fallback={<FullScreenLoader />}>
                  <Routes>
                    {/* Public */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/activities" element={<Activities />} />
                    <Route path="/activities/:activityId" element={<ActivityDetail />} />
                    <Route path="/u/:username" element={<UserProfile />} />
                    <Route path="/communities" element={<Communities />} />
                    <Route path="/communities/:communityId" element={<CommunityDetail />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/guidelines" element={<Guidelines />} />

                    {/* Auth */}
                    <Route element={<PublicOnlyRoute />}>
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                    </Route>
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />

                    {/* Authenticated */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/home" element={<Home />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/create" element={<Create />} />
                      <Route path="/rooms/:roomId" element={<Room />} />
                      <Route path="/my-activity" element={<MyActivity />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/profile/edit" element={<ProfileEdit />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/saved" element={<Saved />} />
                      <Route path="/blocked-users" element={<BlockedUsers />} />
                    </Route>

                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<Admin />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </AppLayout>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}
