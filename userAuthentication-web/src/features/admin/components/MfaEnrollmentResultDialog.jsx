import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';

/**
 * Shown once, immediately after a super-admin enables MFA for a user.
 *
 * Surfaces the TOTP enrollment payload returned by
 * `POST /v1/auth/mfa/enroll` so it can be handed to the user:
 *   - a scannable QR code (otpauth:// encoded)
 *   - the Base32 secret for manual entry
 *   - one-time recovery codes
 *
 * It then collects a 6-digit code to CONFIRM the enrollment. Until confirmed the
 * credential is inert — the backend only requires MFA at login once it is
 * activated. On confirmation, MFA is enforced for that user.
 *
 * @param {object}   props
 * @param {boolean}  props.open
 * @param {object}   [props.user]        The user MFA was enabled for.
 * @param {object}   [props.result]      { secret, qrCodeUrl, recoveryCodes, message }
 * @param {function} props.onConfirm     async (code) => void — throws on failure.
 * @param {function} props.onClose       Dismiss without activating.
 */
export default function MfaEnrollmentResultDialog({ open, user, result, onConfirm, onClose }) {
  const [copied, setCopied] = useState(null); // 'secret' | 'codes' | null
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  if (!open || !result) return null;

  const { secret, qrCodeUrl, recoveryCodes = [] } = result;

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — silently ignore; the
      // values remain visible for manual copying.
    }
  }

  async function submitConfirm(e) {
    e.preventDefault();
    setConfirmError(null);
    if (!/^\d{6}$/.test(code)) {
      setConfirmError('Enter the 6-digit code from the authenticator app.');
      return;
    }
    setConfirming(true);
    try {
      await onConfirm(code);
    } catch (err) {
      setConfirmError(err?.message ?? 'Verification failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  function downloadRecoveryCodes() {
    const header = `Guardian MFA recovery codes${user?.email ? ` — ${user.email}` : ''}\n` +
      `Generated: ${new Date().toISOString()}\n\n`;
    const blob = new Blob([header + recoveryCodes.join('\n') + '\n'], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mfa-recovery-codes${user?.email ? `-${user.email.split('@')[0]}` : ''}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={onClose} title="MFA enrollment started" size="lg">
      <div className="p-6 space-y-6">
        <div className="flex gap-3 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2.5">
          <svg className="h-5 w-5 flex-shrink-0 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.58 0Z" />
          </svg>
          <p className="text-sm text-warning-800 leading-relaxed">
            These values are shown <span className="font-semibold">only once</span>. Share them
            securely with{' '}
            <span className="font-semibold break-all">{user?.email ?? 'the user'}</span>. MFA is{' '}
            <span className="font-semibold">not active</span> until a code is verified below — only
            then is MFA required at login.
          </p>
        </div>

        {/* QR + secret */}
        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          {qrCodeUrl && (
            <div className="flex-shrink-0 rounded-xl border border-neutral-200 p-3 bg-white">
              <img
                src={qrCodeUrl}
                alt="MFA QR code for authenticator app"
                className="h-44 w-44"
                width={176}
                height={176}
              />
            </div>
          )}

          <div className="min-w-0 w-full space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Scan with an authenticator app</h3>
              <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
                Use Google Authenticator, 1Password, Authy, or any TOTP app. Can&apos;t scan? Enter
                this secret manually:
              </p>
            </div>

            {secret && (
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Setup key</label>
                <div className="flex items-stretch gap-2">
                  <code className="flex-1 min-w-0 break-all rounded-lg bg-neutral-100 px-3 py-2 font-mono text-sm text-neutral-800 select-all">
                    {secret}
                  </code>
                  <Button variant="secondary" size="sm" onClick={() => copy(secret, 'secret')}>
                    {copied === 'secret' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recovery codes */}
        {recoveryCodes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Recovery codes</h3>
                <p className="text-xs text-neutral-500">
                  Each code works once if the authenticator device is lost.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copy(recoveryCodes.join('\n'), 'codes')}
                >
                  {copied === 'codes' ? 'Copied' : 'Copy all'}
                </Button>
                <Button variant="secondary" size="sm" onClick={downloadRecoveryCodes}>
                  Download
                </Button>
              </div>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              {recoveryCodes.map((code, i) => (
                <li key={i} className="font-mono text-sm text-neutral-800 select-all">
                  {code}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Activation — verify a code to enforce MFA at login */}
        <form onSubmit={submitConfirm} noValidate className="border-t border-neutral-100 pt-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Activate MFA</h3>
            <p className="text-xs text-neutral-500">
              Enter a current 6-digit code to confirm setup and enforce MFA at sign-in.
            </p>
          </div>

          {confirmError && <Alert variant="error" message={confirmError} />}

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="w-full sm:max-w-[12rem]">
              <Input
                id="mfa-confirm-code"
                label="Verification code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={confirming}
              />
            </div>
            <div className="flex gap-3 sm:ml-auto">
              <Button variant="secondary" size="md" onClick={onClose} disabled={confirming}>
                Later
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={confirming}
                loadingLabel="Verifying…"
              >
                Verify &amp; activate
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
