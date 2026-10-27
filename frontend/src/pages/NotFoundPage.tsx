import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-md py-10 text-center">
      <p className="m-0 text-5xl font-bold text-primary">404</p>
      <h1 className="mt-2">Page not found</h1>
      <p className="text-muted">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="btn btn-primary">
        Back to My work
      </Link>
    </div>
  );
}
