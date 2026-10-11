import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';
import { Logo } from '../components/AppLayout';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { refreshSession, isAuthenticated } = useAuth();
  const [state, setState] = useState({ status: 'loading', message: '' });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setState({ status: 'error', message: 'This verification link is missing its token.' });
      return;
    }

    (async () => {
      try {
        await api.post('/auth/verify-email', { token });
        // Pull fresh profile so the UI reflects verified status.
        try {
          await refreshSession();
        } catch {
          // Not signed in on this device — that's fine.
        }
        setState({ status: 'ok', message: 'Your email is verified. You now have full access.' });
      } catch (err) {
        setState({ status: 'error', message: errorMessage(err, 'This link is invalid or has expired') });
      }
    })();
  }, [token, refreshSession]);

  return (
    <div className="max-w-md mx-auto py-10 px-4 text-center">
      <div className="flex justify-center mb-6">
        <Logo />
      </div>
      <div className="card p-6">
        {state.status === 'loading' && <Spinner label="Verifying your email…" />}
        {state.status === 'ok' && (
          <>
            <h1 className="text-xl font-extrabold text-primary">You&rsquo;re verified</h1>
            <p className="text-sm text-ink-soft mt-2">{state.message}</p>
            <Link to={isAuthenticated ? '/home' : '/login'} className="inline-block mt-4 text-sm font-semibold text-primary hover:underline">
              {isAuthenticated ? 'Go to Home' : 'Sign in'}
            </Link>
          </>
        )}
        {state.status === 'error' && (
          <>
            <h1 className="text-xl font-extrabold text-red-500">Link didn&rsquo;t work</h1>
            <p className="text-sm text-ink-soft mt-2">{state.message}</p>
            <p className="text-sm mt-4">
              <Link to="/home" className="font-semibold text-primary hover:underline">
                Back to the app
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
