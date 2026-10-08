/**
 * Split-panel authentication layout.
 *
 * Desktop (lg+): Left branding panel | Right form card.
 * Mobile:        Single column — form first, branding hidden.
 *
 * The branding panel uses inline SVG for all decorative elements, avoiding
 * external asset dependencies.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="auth-bg min-h-dvh flex items-stretch">
      {/* ── Branding panel (desktop only) ─────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-[44%] flex-col justify-between p-10 xl:p-14
                   bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 relative overflow-hidden"
        aria-hidden="true"
      >
        {/* Decorative circles */}
        <svg
          className="absolute -top-24 -right-24 opacity-10"
          width="480"
          height="480"
          viewBox="0 0 480 480"
          fill="none"
        >
          <circle cx="240" cy="240" r="240" stroke="white" strokeWidth="64" />
        </svg>
        <svg
          className="absolute -bottom-32 -left-20 opacity-[0.07]"
          width="400"
          height="400"
          viewBox="0 0 400 400"
          fill="none"
        >
          <circle cx="200" cy="200" r="200" stroke="white" strokeWidth="80" />
        </svg>

        {/* Brand mark */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M12 1L3 5.5v7c0 5.25 3.77 10.16 9 11.36 5.23-1.2 9-6.11 9-11.36v-7L12 1z" />
              <path
                d="M9 12.5l2 2 4-4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            Guardian Services
          </span>
        </div>

        {/* Central copy */}
        <div className="relative z-10 space-y-5">
          <h1 className="text-white font-bold leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', letterSpacing: '-0.04em' }}>
            Secure access<br />you can rely on.
          </h1>
          <p className="text-brand-200 text-base leading-relaxed max-w-xs">
            Your account is protected by industry-standard encryption, token
            rotation, and continuous session monitoring.
          </p>

          {/* Feature list */}
          <ul className="space-y-3 mt-6">
            {[
              'End-to-end encrypted credentials',
              'Short-lived access tokens',
              'Automatic session monitoring',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-brand-100">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="currentColor">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-brand-300">
          © {new Date().getFullYear()} Guardian Services
        </p>
      </div>

      {/* ── Form panel ────────────────────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col items-center justify-center p-5 sm:p-8 lg:p-12"
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center shadow">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
              <path d="M12 1L3 5.5v7c0 5.25 3.77 10.16 9 11.36 5.23-1.2 9-6.11 9-11.36v-7L12 1z" />
              <path
                d="M9 12.5l2 2 4-4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <span className="font-semibold text-neutral-800 tracking-tight">Guardian Services</span>
        </div>

        {/* Card */}
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  );
}
