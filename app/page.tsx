"use client";

import { useState } from "react";
import { encryptSecret } from "@/lib/crypto";

export default function Home() {
  const [text, setText] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState(3600);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCreate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Encrypt locally in browser via Web Crypto API (AES-GCM 256)
      const { ciphertext, iv, key } = await encryptSecret(text);

      // 2. Transmit only the encrypted payload to backend (key is never sent)
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciphertext, iv, ttlSeconds }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create secret link");
      }

      // 3. Decryption key lives ONLY in client URL hash fragment
      setLink(`${window.location.origin}/secret/${data.id}#${key}`);
      setText("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      setCopied(false);
    }
  };

  const handleReset = () => {
    setLink("");
    setText("");
    setErrorMessage("");
    setCopied(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] bg-slate-950 px-4 py-8 text-slate-100 sm:py-14">
      {/* Header */}
      <header className="flex w-full max-w-2xl flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 shadow-inner backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          Zero-Knowledge &middot; AES-GCM 256-Bit
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
          Krypton <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400">Vault</span>
        </h1>
        <p className="mt-3 max-w-lg text-sm text-slate-400 sm:text-base">
          Send self-destructing passwords, tokens, and confidential notes. The server never receives your decryption key.
        </p>
      </header>

      {/* Main Card */}
      <main className="mt-8 w-full max-w-xl">
        <div className="relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl sm:p-8">
          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <svg className="h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {!link ? (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between pb-2">
                  <label htmlFor="secret-input" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Your Confidential Secret
                  </label>
                  <span className="text-xs text-slate-500 font-mono">
                    {text.length} chars
                  </span>
                </div>
                <textarea
                  id="secret-input"
                  rows={5}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste password, private key, API token, or secret note..."
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 p-3.5 font-mono text-sm text-slate-200 placeholder-slate-600 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {/* Expiration Settings */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Self-Destruction Expiration
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "5 Minutes", value: 300 },
                    { label: "1 Hour", value: 3600 },
                    { label: "1 Day", value: 86400 },
                    { label: "7 Days", value: 604800 },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTtlSeconds(option.value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        ttlSeconds === option.value
                          ? "border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow-sm shadow-indigo-500/20"
                          : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  The secret will immediately delete once viewed, or when this timer expires.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                id="generate-link-btn"
                onClick={handleCreate}
                disabled={loading || !text.trim()}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span>Encrypting & Generating Link...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Generate One-Time Link</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <svg className="h-5 w-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="font-semibold">Secret encrypted and saved!</span>
                  <p className="text-[11px] text-emerald-400/80">
                    The link below can only be read once. Once opened, it self-destructs instantly.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  One-Time Secret Link
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={link}
                    aria-label="One-Time Secret Link"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-3 pr-24 font-mono text-xs text-slate-300 selection:bg-indigo-600 focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute right-1.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-indigo-500"
                  >
                    {copied ? (
                      <>
                        <svg className="h-3.5 w-3.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/90">
                <span className="font-semibold text-amber-200">Zero-Knowledge Notice:</span>{" "}
                The decryption key is strictly contained within the URL fragment (<code className="font-mono text-amber-300">#...</code>). If the hash is altered or lost, the secret cannot be deciphered by anyone.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-xl border border-slate-800 bg-slate-800/50 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  Create another secret
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Feature Highlights */}
      <section className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-center backdrop-blur-md">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="mt-2 text-xs font-bold text-slate-200">End-to-End Encrypted</h2>
          <p className="mt-1 text-[11px] text-slate-400">AES-GCM 256 encryption performed directly in your browser.</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-center backdrop-blur-md">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h2 className="mt-2 text-xs font-bold text-slate-200">Zero-Knowledge</h2>
          <p className="mt-1 text-[11px] text-slate-400">Decryption key resides only in the hash fragment, never hitting the server.</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-center backdrop-blur-md">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="mt-2 text-xs font-bold text-slate-200">Single-Read Self-Destruct</h2>
          <p className="mt-1 text-[11px] text-slate-400">Payload is atomically erased from Redis memory the instant it is fetched.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-600">
        Krypton Vault &middot; Secure ephemeral communications
      </footer>
    </div>
  );
}