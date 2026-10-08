import React from 'react';

/**
 * Visible banner shown whenever the dashboard is displaying mock data because
 * the real admin API endpoints are not yet live. Never let a mocked operation
 * masquerade as a real one.
 */
export default function MockDataBanner({ className = '' }) {
  return (
    <div
      role="status"
      className={`flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-2.5 text-xs font-medium text-warning-700 ${className}`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
      Showing mock data — admin API endpoints are not yet available on the backend.
    </div>
  );
}
