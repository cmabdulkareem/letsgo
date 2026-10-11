import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Plus, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input, Select, Textarea } from '../components/ui';
import { UserAvatar } from '../components/Avatar';

const schema = z.object({
  displayName: z.string().trim().min(2, 'Too short').max(60),
  bio: z.string().trim().max(300).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  ageRange: z.string().optional(),
});

export default function ProfileEdit() {
  const { user, setUser, refreshSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [interestDraft, setInterestDraft] = useState('');
  const [interests, setInterests] = useState(user?.interests || []);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      city: user?.city || '',
      ageRange: user?.ageRange || '',
    },
  });

  const uploadAvatar = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fresh = await refreshSession();
      setUser(fresh);
      showToast('Photo updated', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const addInterest = () => {
    const v = interestDraft.trim();
    if (!v || interests.includes(v) || interests.length >= 30) return;
    setInterests([...interests, v]);
    setInterestDraft('');
  };

  const onSubmit = async (values) => {
    try {
      const payload = { ...values, interests };
      if (!payload.ageRange) delete payload.ageRange;
      await api.patch('/users/me', payload);
      const fresh = await refreshSession();
      setUser(fresh);
      showToast('Profile saved', 'success');
      navigate('/profile');
    } catch (err) {
      showToast(errorMessage(err, 'Could not save'), 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold text-ink">Edit profile</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-5 mt-4 space-y-4" noValidate>
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar user={user} size={80} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white grid place-items-center shadow hover:bg-primary-600 disabled:opacity-50"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(e) => uploadAvatar(e.target.files?.[0])}
            />
          </div>
          <p className="text-xs text-ink-soft">JPG, PNG, WebP, AVIF or GIF. Up to 5 MB.</p>
        </div>

        <Input label="Display name" error={errors.displayName?.message} {...register('displayName')} />
        <Textarea label="Bio" placeholder="A line or two about you" error={errors.bio?.message} {...register('bio')} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="City" placeholder="Kasaragod" error={errors.city?.message} {...register('city')} />
          <Select label="Age range (optional)" {...register('ageRange')}>
            <option value="">Prefer not to say</option>
            <option value="18-24">18–24</option>
            <option value="25-34">25–34</option>
            <option value="35-44">35–44</option>
            <option value="45-54">45–54</option>
            <option value="55+">55+</option>
          </Select>
        </div>

        <div>
          <span className="label">Interests</span>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="e.g. Badminton"
              value={interestDraft}
              onChange={(e) => setInterestDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addInterest();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addInterest} aria-label="Add interest">
              <Plus size={16} />
            </Button>
          </div>
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {interests.map((i) => (
                <span key={i} className="chip bg-border/50 text-ink">
                  {i}
                  <button
                    type="button"
                    aria-label={`Remove ${i}`}
                    onClick={() => setInterests(interests.filter((x) => x !== i))}
                    className="ml-1 text-ink-soft hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button type="submit" loading={isSubmitting} disabled={uploading}>
            Save changes
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/profile')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
