import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterRequest } from '@mom/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FormField } from '../components/FormField';
import { applyServerErrors, fieldError } from '../lib/forms';

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(RegisterRequest),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await auth.register(values);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        setError('email', { type: 'server', message: err.message });
        return;
      }
      setFormError(applyServerErrors(err, setError));
    }
  });

  return (
    <main id="main" className="app-main">
      <div className="card" style={{ maxWidth: '28rem', margin: '2rem auto' }}>
        <h1>Create account</h1>
        <form onSubmit={onSubmit} noValidate>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <FormField label="Name" id="reg-name" error={fieldError(errors, 'name')}>
            {(a11y) => <input autoComplete="name" {...a11y} {...register('name')} />}
          </FormField>
          <FormField label="Email" id="reg-email" error={fieldError(errors, 'email')}>
            {(a11y) => <input type="email" autoComplete="email" {...a11y} {...register('email')} />}
          </FormField>
          <FormField
            label="Password"
            id="reg-password"
            hint="At least 10 characters."
            error={fieldError(errors, 'password')}
          >
            {(a11y) => (
              <input
                type="password"
                autoComplete="new-password"
                {...a11y}
                {...register('password')}
              />
            )}
          </FormField>
          <button type="submit" disabled={isSubmitting}>
            Create account
          </button>
        </form>
        <p>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
