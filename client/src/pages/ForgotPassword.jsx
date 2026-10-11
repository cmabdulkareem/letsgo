import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, errorMessage } from '../lib/api';
import { Button, Input } from '../components/ui';
import { Logo } from '../components/AppLayout';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export default function ForgotPassword() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await api.post('/auth/forgot-password', values);
      setDone(true);
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="flex justify-center mb-6">
        <Logo />
      </div>
      <div className="card p-6">
        <h1 className="text-xl font-extrabold text-ink">Reset your password</h1>
        {done ? (
          <p className="text-sm text-ink-soft mt-2">
            If an account exists for that email, a reset link is on its way. Check your inbox (and spam folder).
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-soft mt-1 mb-6">
              Enter your account email and we&rsquo;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
              {serverError && <p className="text-sm text-red-500">{serverError}</p>}
              <Button type="submit" loading={isSubmitting} className="w-full">
                Send reset link
              </Button>
            </form>
          </>
        )}
      </div>
      <p className="text-center text-sm text-ink-soft mt-4">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
