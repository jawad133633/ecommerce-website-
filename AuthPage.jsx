import { useState } from "react";

export default function AuthPage({ mode, onSubmit, onNavigate, busy, error }) {
  const isSignup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="auth-page">
      <header className="auth-header">
        <a className="wordmark" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>THE <span>GOOD MARKET</span></a>
        <a className="auth-back" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>Continue shopping</a>
      </header>
      <div className="auth-layout">
        <section className="auth-welcome">
          <p className="eyebrow">A marketplace made for discovery</p>
          <h1>{isSignup ? <>Your next<br /><em>good find</em><br />starts here.</> : <>Good to<br /><em>see you</em><br />again.</>}</h1>
          <p>One account for good finds, independent stores and orders delivered across Pakistan.</p>
          <div className="auth-perks"><span>Discover independent stores</span><span>Save your favourite finds</span><span>Keep track of every order</span></div>
        </section>
        <section className="auth-card" aria-labelledby="auth-title">
          <p className="eyebrow">{isSignup ? "Join the marketplace" : "Welcome back"}</p>
          <h2 id="auth-title">{isSignup ? "Create your account" : "Sign in to your account"}</h2>
          <p className="auth-card-intro">{isSignup ? "It only takes a moment to get started." : "Enter your details to continue shopping."}</p>
          {error && <p className="form-error auth-error" role="alert">{error}</p>}
          <form className="auth-form" onSubmit={onSubmit}>
            {isSignup && <label>Full name<input name="name" autoComplete="name" required maxLength="80" placeholder="Your name" /></label>}
            <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
            <label>Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} minLength="8" required placeholder={isSignup ? "At least 8 characters" : "Your password"} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button></div></label>
            {isSignup && <p className="auth-terms">By creating an account, you agree to use the marketplace responsibly.</p>}
            <button className="button button-dark auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}</button>
          </form>
          <p className="auth-switch">{isSignup ? "Already have an account?" : "New to The Good Market?"} <button type="button" onClick={() => onNavigate(isSignup ? "/login" : "/signup")}>{isSignup ? "Sign in" : "Create account"}</button></p>
        </section>
      </div>
      <footer className="auth-footer">Shop a little. Find a lot. <span>© 2026 The Good Market</span></footer>
    </main>
  );
}
