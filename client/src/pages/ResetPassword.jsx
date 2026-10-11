import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, errorMessage } from '../lib/api';
import { Button, Input } from '../components/ui';
import { Logo } from '../components/AppLayout';

const schema = z.object({
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(72)
    .regex(/[a-zA-Z]/, 'Include a letter')
    .regex(/[0-9]/, 'Include a number'),
});

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(errorMessage(err, 'This reset link is invalid or has expired'));
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-10 px-4 text-center">
        <p className="text-sm text-ink-soft">This reset link is missing its token. Request a new one.</p>
        <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="flex justify-center mb-6">
        <Logo />
      </div>
      <div className="card p-6">
        <h1 className="text-xl font-extrabold text-ink">Choose a new password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4" noValidate>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters, with a letter and a number"
            error={errors.password?.message}
            {...register('password')}
          />
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <Button type="submit" loading={isSubmitting} className="w-full">
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
