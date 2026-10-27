import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequest } from '@mom/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../api/client';
import { safeRedirect, useAuth } from '../auth/AuthContext';
import { FormField } from '../components/FormField';
import { fieldError } from '../lib/forms';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(LoginRequest), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      navigate(safeRedirect(params.get('next')), { replace: true });
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-xl font-bold tracking-tight text-primary">
          MoM Tracker
        </p>
        <div className="card shadow-lg">
          <h1 className="mb-6">Sign in</h1>
          <form onSubmit={onSubmit} noValidate>
            {formError && (
              <p
                className="mb-4 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger"
                role="alert"
              >
                {formError}
              </p>
            )}
            <FormField label="Email" id="login-email" error={fieldError(errors, 'email')}>
              {(a11y) => (
                <input type="email" autoComplete="email" {...a11y} {...register('email')} />
              )}
            </FormField>
            <FormField label="Password" id="login-password" error={fieldError(errors, 'password')}>
              {(a11y) => (
                <input
                  type="password"
                  autoComplete="current-password"
                  {...a11y}
                  {...register('password')}
                />
              )}
            </FormField>
            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              Sign in
            </button>
          </form>
          <p className="mt-6 mb-0 text-center text-sm text-muted">
            No account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
