import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { Logo } from '../components/AppLayout';

const schema = z.object({
  displayName: z.string().trim().min(2, 'Display name is too short').max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'At least 3 characters')
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Letters, numbers and underscores only'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(72)
    .regex(/[a-zA-Z]/, 'Include a letter')
    .regex(/[0-9]/, 'Include a number'),
  city: z.string().trim().max(80).optional(),
});

export default function Register() {
  const navigate = useNavigate();
  const { loginWith } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const { data } = await api.post('/auth/register', { ...values, city: values.city || '' });
      loginWith(data.data);
      navigate('/home', { replace: true });
    } catch (err) {
      setServerError(errorMessage(err, 'Could not create your account'));
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="flex justify-center mb-6">
        <Logo />
      </div>
      <div className="card p-6">
        <h1 className="text-xl font-extrabold text-ink">Join Let&rsquo;s Go</h1>
        <p className="text-sm text-ink-soft mt-1 mb-6">
          You don&rsquo;t need a group to join. You join to find your group.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Display name" placeholder="e.g. Aman Kapoor" error={errors.displayName?.message} {...register('displayName')} />
          <Input
            label="Username"
            placeholder="e.g. aman_k"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
          <Input label="City (optional)" placeholder="Kasaragod" error={errors.city?.message} {...register('city')} />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters, with a letter and a number"
            error={errors.password?.message}
            {...register('password')}
          />
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <Button type="submit" loading={isSubmitting} className="w-full">
            Create account
          </Button>
        </form>
        <p className="text-xs text-ink-soft mt-4">
          By creating an account you agree to our{' '}
          <Link to="/terms" className="text-blue-600 hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          . We&rsquo;ll email you a verification link.
        </p>
      </div>
      <p className="text-center text-sm text-ink-soft mt-4">
        Already a member?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
