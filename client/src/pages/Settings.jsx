import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Eye, Palette, UserX, Moon, Sun } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Select } from '../components/ui';

const CHANNELS = [
  { key: 'joinRequests', label: 'Join requests' },
  { key: 'membership', label: 'Members & rooms' },
  { key: 'scheduling', label: 'Scheduling & polls' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'cancellations', label: 'Cancellations' },
];

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
      <span className="text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition relative shrink-0 ${checked ? 'bg-primary' : 'bg-border'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

export default function Settings() {
  const { user, setUser, refreshSession, logout, isVerified } = useAuth();
  const { dark, toggle } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const prefs = user?.notificationPreferences || {};
  const privacy = user?.privacySettings || {};

  const save = async (payload) => {
    setSaving(true);
    try {
      await api.patch('/users/me', payload);
      const fresh = await refreshSession();
      setUser(fresh);
      showToast('Settings saved', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const setChannel = (channel, key, value) => {
    save({
      notificationPreferences: {
        [key]: { ...prefs?.[key], [channel]: value },
      },
    });
  };

  const deactivate = async () => {
    try {
      await api.post('/users/me/deactivate');
      await logout();
      navigate('/');
    } catch (err) {
      showToast(errorMessage(err, 'Could not deactivate'), 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-extrabold text-ink">Settings</h1>

      <Card className="p-5">
        <h2 className="font-extrabold text-ink flex items-center gap-2">
          <Bell size={17} className="text-primary" /> Notifications
        </h2>
        <p className="text-xs text-ink-soft mt-1 mb-2">Choose what reaches you, per channel.</p>
        <div className="divide-y divide-border">
          {CHANNELS.map(({ key, label }) => (
            <div key={key} className="py-2">
              <p className="text-sm font-bold text-ink">{label}</p>
              <div className="grid grid-cols-2 gap-x-4">
                <Toggle
                  label="In-app"
                  checked={prefs?.inApp?.[key] !== false}
                  onChange={(v) => setChannel(key, 'inApp', v)}
                />
                <Toggle
                  label="Push"
                  checked={prefs?.push?.[key] !== false}
                  onChange={(v) => setChannel(key, 'push', v)}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-soft mt-2">Email notifications are only sent for security events.</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-extrabold text-ink flex items-center gap-2">
          <Eye size={17} className="text-primary" /> Privacy
        </h2>
        <div className="mt-3 space-y-3">
          <Select
            label="Profile visibility"
            value={privacy.profileVisibility || 'public'}
            onChange={(e) => save({ privacySettings: { ...privacy, profileVisibility: e.target.value } })}
          >
            <option value="public">Public — anyone can view</option>
            <option value="members">Members only — people who share an activity with you</option>
          </Select>
          <Toggle
            label="Show my activity history on my profile"
            checked={privacy.showActivityHistory !== false}
            onChange={(v) => save({ privacySettings: { ...privacy, showActivityHistory: v } })}
          />
          <Toggle
            label="Show my attendance summary"
            checked={privacy.showAttendance !== false}
            onChange={(v) => save({ privacySettings: { ...privacy, showAttendance: v } })}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-extrabold text-ink flex items-center gap-2">
          <Palette size={17} className="text-primary" /> Appearance
        </h2>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => dark && toggle()}
            aria-pressed={!dark}
            className={`flex-1 min-h-[44px] rounded-2xl border flex items-center justify-center gap-2 text-sm font-semibold ${
              !dark ? 'border-primary text-primary bg-primary/5' : 'border-border text-ink-soft'
            }`}
          >
            <Sun size={16} /> Light
          </button>
          <button
            type="button"
            onClick={() => !dark && toggle()}
            aria-pressed={dark}
            className={`flex-1 min-h-[44px] rounded-2xl border flex items-center justify-center gap-2 text-sm font-semibold ${
              dark ? 'border-primary text-primary bg-primary/5' : 'border-border text-ink-soft'
            }`}
          >
            <Moon size={16} /> Dark
          </button>
        </div>
        <p className="text-xs text-ink-soft mt-2">Your choice is remembered on this device.</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-extrabold text-ink flex items-center gap-2">
          <UserX size={17} className="text-red-500" /> Account
        </h2>
        <p className="text-sm text-ink-soft mt-2">
          Signed in as <span className="font-semibold text-ink">{user?.email}</span>
          {isVerified ? ' · verified' : ' · not verified yet'}.
        </p>
        <div className="mt-4 pt-4 border-t border-border">
          {!confirmDeactivate ? (
            <Button variant="danger" size="sm" onClick={() => setConfirmDeactivate(true)}>
              Deactivate account
            </Button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-4">
              <p className="text-sm font-bold text-red-600">This permanently deactivates your account.</p>
              <p className="text-xs text-ink-soft mt-1">
                You will be signed out everywhere. Existing rooms you hosted stay visible to members.
              </p>
              <div className="flex gap-2 mt-3">
                <Button variant="danger" size="sm" onClick={deactivate}>
                  Yes, deactivate
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(false)}>
                  Keep my account
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
