import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input } from '../components/ui';
import { Logo } from '../components/AppLayout';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWith } = useAuth();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const { data } = await api.post('/auth/login', values);
      loginWith(data.data);
      showToast('Welcome back', 'success');
      navigate(location.state?.from || '/home', { replace: true });
    } catch (err) {
      setServerError(errorMessage(err, 'Could not sign you in'));
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="flex justify-center mb-6">
        <Logo />
      </div>
      <div className="card p-6">
        <h1 className="text-xl font-extrabold text-ink">Welcome back</h1>
        <p className="text-sm text-ink-soft mt-1 mb-6">Sign in to find your next activity.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            error={errors.password?.message}
            {...register('password')}
          />
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <Button type="submit" loading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
      <p className="text-center text-sm text-ink-soft mt-4">
        New here?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
