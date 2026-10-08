import React from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';

/**
 * Safeguard confirmation dialog shown before a super-admin toggles a user's MFA.
 *
 * @param {object}   props
 * @param {boolean}  props.open
 * @param {object}   [props.user]        The user whose MFA is being changed.
 * @param {boolean}  [props.nextValue]   The MFA state being applied (true=enable).
 * @param {boolean}  [props.submitting]
 * @param {function} props.onConfirm
 * @param {function} props.onClose
 */
export default function MfaConfirmationDialog({
  open,
  user,
  nextValue,
  submitting = false,
  onConfirm,
  onClose,
}) {
  if (!open || !user) return null;

  const enabling = nextValue === true;
  const title = enabling ? 'Enable MFA' : 'Disable MFA';

  return (
    <Modal open={open} onClose={submitting ? () => {} : onClose} title={title} size="sm">
      <div className="p-6">
        <div className="flex gap-4">
          <div
            className={`flex-shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center ${
              enabling ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'
            }`}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              {enabling ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h12a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z" />
              )}
            </svg>
          </div>

          <div className="min-w-0">
            <p className="text-sm text-neutral-700 leading-relaxed">
              Are you sure you want to{' '}
              <span className="font-semibold">{enabling ? 'enable' : 'disable'}</span> MFA for{' '}
              <span className="font-semibold break-all">{user.email}</span>?
            </p>
            {!enabling && (
              <p className="mt-2 text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2">
                This reduces account security. The user will no longer be prompted for a
                second factor at sign-in.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={enabling ? 'primary' : 'danger'}
            size="sm"
            onClick={onConfirm}
            loading={submitting}
            loadingLabel="Updating…"
          >
            {enabling ? 'Enable MFA' : 'Disable MFA'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
