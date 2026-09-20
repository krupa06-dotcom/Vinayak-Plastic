'use client';

import { useEffect } from 'react';
import { supabase, configured, loginHref, dashboardHref } from '@/scripts/admin/core';

// Login — port of src/pages/admin/login.astro. Event wiring lives in a
// useEffect since there are no inline handlers in the hand-rolled markup.
export default function LoginForm() {
  useEffect(() => {
    if (!configured) return;

    void (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return;
      // An authorised admin continues to the dashboard; a leftover session
      // for a non-admin account is cleared so the user can sign in fresh.
      const isAdmin = /@vinayakplastics\.com$/i.test(session.user?.email || '');
      if (!isAdmin) await supabase.auth.signOut();
      window.location.replace(isAdmin ? dashboardHref() : loginHref());
    })();

    const form = document.getElementById('login-form') as HTMLFormElement | null;
    const errorBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');
    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;

    function showError(msg: string) {
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = '';
      }
    }
    function hideError() {
      if (errorBox) errorBox.style.display = 'none';
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const email = emailInput?.value.trim();
      const password = passwordInput?.value ?? '';

      if (!email || !password) {
        showError('Please enter your email and password.');
        return;
      }

      submitBtn?.setAttribute('disabled', '');
      if (submitBtn) submitBtn.textContent = 'Signing in…';

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        showError(
          error.message === 'Invalid login credentials'
            ? 'Invalid email or password. Please try again.'
            : error.message
        );
        submitBtn?.removeAttribute('disabled');
        if (submitBtn) submitBtn.textContent = 'Sign in';
        return;
      }

      // Only @vinayakplastics.com accounts are authorised.
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user || !/@vinayakplastics\.com$/i.test(user.email || '')) {
        await supabase.auth.signOut();
        showError('Only @vinayakplastics.com accounts are authorised.');
        submitBtn?.removeAttribute('disabled');
        if (submitBtn) submitBtn.textContent = 'Sign in';
        return;
      }

      window.location.replace(dashboardHref());
    });
  }, []);

  return (
    <div className="admin-login-body" data-admin-page="login">
      <div className="a-login-card">
        <div className="a-login-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/vp-logo.png" alt="Vinayak Plastics logo" />
          <h1>Vinayak Plastics</h1>
          <p>Admin Panel</p>
        </div>

        {configured ? (
          <form id="login-form" noValidate>
            <div className="a-form-row">
              <div className="a-field">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  className="a-input"
                  required
                  placeholder="admin@vinayakplastics.com"
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="a-form-row">
              <div className="a-field">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  className="a-input"
                  required
                  placeholder="Password"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className="a-form-row" style={{ marginBottom: 18 }}>
              <div id="login-error" className="a-tip a-tip-error" style={{ display: 'none', marginBottom: 14 }} role="alert"></div>
              <button type="submit" className="a-btn a-btn-primary a-btn-block" id="login-submit">
                Sign in
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--a-muted)', textAlign: 'center', margin: 0 }}>
              Only <strong>@vinayakplastics.com</strong> accounts are authorised.
            </p>
          </form>
        ) : (
          <div className="a-tip a-tip-error" style={{ marginTop: 18 }}>
            Supabase is not configured. Add your environment variables to continue.
          </div>
        )}
      </div>
    </div>
  );
}