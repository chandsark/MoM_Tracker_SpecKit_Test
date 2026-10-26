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
    <main id="main" className="app-main">
      <div className="card" style={{ maxWidth: '28rem', margin: '2rem auto' }}>
        <h1>Sign in</h1>
        <form onSubmit={onSubmit} noValidate>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <FormField label="Email" id="login-email" error={fieldError(errors, 'email')}>
            {(a11y) => <input type="email" autoComplete="email" {...a11y} {...register('email')} />}
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
          <button type="submit" disabled={isSubmitting}>
            Sign in
          </button>
        </form>
        <p>
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </main>
  );
}
