import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-800">
            <span className="text-5xl font-bold text-surface-400">404</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">Page not found</h1>
        <p className="text-surface-500 mb-8 max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/dashboard">
          <Button>
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}