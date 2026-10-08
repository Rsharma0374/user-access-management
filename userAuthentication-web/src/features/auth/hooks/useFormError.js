/**
 * Utility hook that helps bridge backend field-level errors into
 * React Hook Form's setError.
 *
 * Usage:
 *   const { applyServerErrors, formError, setFormError, clearFormError } = useFormError();
 *
 *   try { ... }
 *   catch (err) {
 *     const handled = applyServerErrors(err, setError);   // sets RHF field errors
 *     if (!handled) setFormError(err.message);            // set banner message
 *   }
 */

import { useState } from 'react';
import { ApiError } from '../../../services/httpClient.js';

export function useFormError() {
  const [formError, setFormError] = useState(null);

  const clearFormError = () => setFormError(null);

  /**
   * If `error` is an ApiError with `.errors` map, set each field error in RHF
   * and return `true`. Otherwise return `false`.
   *
   * @param {unknown} error
   * @param {Function} setError - React Hook Form's setError function
   * @returns {boolean} Whether field errors were applied
   */
  const applyServerErrors = (error, setError) => {
    if (error instanceof ApiError && error.errors && typeof error.errors === 'object') {
      Object.entries(error.errors).forEach(([field, message]) => {
        setError(field, { type: 'server', message: String(message) });
      });
      return true;
    }
    return false;
  };

  return { formError, setFormError, clearFormError, applyServerErrors };
}
