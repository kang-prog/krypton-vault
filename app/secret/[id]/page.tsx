"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { decryptSecret } from "@/lib/crypto";

type SecretStatus = "verifying" | "ready" | "missing_key" | "not_found" | "revealed" | "error";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SecretViewerPage({ params }: PageProps) {
  const { id } = use(params);

  const [status, setStatus] = useState<SecretStatus>("verifying");
  const [key, setKey] = useState<string>("");
  const [ttlRemaining, setTtlRemaining] = useState<number | null>(null);
  const [revealing, setRevealing] = useState<boolean>(false);
  const [decryptedText, setDecryptedText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let isCancelled = false;

    async function checkSecret() {
      // 1. Check if hash key is present in client URL
      const hashKey = window.location.hash.replace(/^#/, "");

      if (!hashKey) {
        if (!isCancelled) setStatus("missing_key");
        return;
      }

      setKey(hashKey);

      // 2. Query vault API for secret existence and remaining TTL
      try {
        const res = await fetch(`/api/secrets/${id}`);
        if (!res.ok) {
          if (!isCancelled) setStatus("not_found");
          return;
        }

        const data = await res.json();
        if (!isCancelled) {
          setTtlRemaining(typeof data.ttl === "number" ? data.ttl : null);
          setStatus("ready");
        }
      } catch {
        if (!isCancelled) setStatus("not_found");
      }
    }

    checkSecret();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const handleReveal = async () => {
    if (!key) return;
    setRevealing(true);
    setErrorMessage("");

    try {
      // 1. Fetch and atomically burn the secret from the server
      const res = await fetch(`/api/secrets/${id}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Secret has already been viewed or has expired.");
      }

      // 2. Decrypt locally in browser using the hash key
      const plainText = await decryptSecret(data.ciphertext, data.iv, key);
      setDecryptedText(plainText);
      setStatus("revealed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to decrypt secret payload.";
      setErrorMessage(message);
      setStatus("error");
    } finally {
      setRevealing(false);
    }
  };

  const handleCopy = async () => {
    if (!decryptedText) return;
    try {
      await navigator.clipboard.writeText(decryptedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleClearScreen = () => {
    setDecryptedText("");
    setStatus("not_found");
  };

  const formatTtl = (seconds: number | null) => {
    if (seconds === null) return "Limited time";
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] bg-slate-950 px-4 py-8 text-slate-100 sm:py-14">
      {/* Header */}
      <header className="flex w-full max-w-2xl flex-col items-center text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 shadow-inner backdrop-blur-md transition hover:bg-indigo-500/20"
        >
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          Krypton Vault &middot; Secure Portal
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Confidential Secret
        </h1>
      </header>

      {/* Main Container */}
      <main className="mt-8 w-full max-w-lg">
        <div className="relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl sm:p-8">
          {/* State 1: Verifying */}
          {status === "verifying" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="h-8 w-8 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <p className="mt-4 text-sm font-medium text-slate-300">Checking vault status...</p>
              <p className="mt-1 text-xs text-slate-500">Verifying cryptographic hash fragment</p>
            </div>
          )}

          {/* State 2: Ready to Reveal */}
          {status === "ready" && (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">An Encrypted Secret Awaits</h2>
                <p className="mt-1.5 text-xs text-slate-400">
                  This message is protected with AES-256 GCM client-side encryption.
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-left text-xs text-amber-200/90">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Self-Destruction Warning</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-300/80">
                  This secret will be <strong>permanently destroyed</strong> from server memory the moment you click reveal. You will not be able to view it a second time.
                </p>
                {ttlRemaining !== null && (
                  <p className="mt-2 text-[11px] font-mono text-amber-400">
                    Expires automatically in: {formatTtl(ttlRemaining)}
                  </p>
                )}
              </div>

              <button
                type="button"
                id="reveal-secret-btn"
                onClick={handleReveal}
                disabled={revealing}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 disabled:opacity-50"
              >
                {revealing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span>Fetching & Decrypting...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Reveal & Destroy Secret</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* State 3: Revealed Secret */}
          {status === "revealed" && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <svg className="h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span><strong>Permanently destroyed:</strong> This secret was deleted from the server and cannot be retrieved again.</span>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <label htmlFor="decrypted-content" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Decrypted Content
                  </label>
                  <span className="text-xs text-emerald-400 font-mono">
                    AES-256 Decrypted
                  </span>
                </div>
                <textarea
                  id="decrypted-content"
                  readOnly
                  rows={6}
                  value={decryptedText}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-3.5 font-mono text-sm text-slate-100 selection:bg-indigo-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  id="copy-revealed-btn"
                  onClick={handleCopy}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-indigo-500"
                >
                  {copied ? (
                    <>
                      <svg className="h-4 w-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>Copy Secret</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClearScreen}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                  <span>Clear Screen</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/"
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  Send your own secret
                </Link>
              </div>
            </div>
          )}

          {/* State 4: Missing Key */}
          {status === "missing_key" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-200">Decryption Key Missing</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  The link you opened is missing the hash fragment (<code className="font-mono text-amber-300">#...</code>) containing the decryption key. Without this key, the payload cannot be decrypted.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-slate-800 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Create a New Secret
                </Link>
              </div>
            </div>
          )}

          {/* State 5: Not Found / Already Destroyed */}
          {status === "not_found" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-slate-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-200">Secret Expired or Destroyed</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  This secret does not exist in Krypton Vault. It has either expired or was already opened and permanently destroyed.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-indigo-500"
                >
                  Create a New Secret
                </Link>
              </div>
            </div>
          )}

          {/* State 6: Decryption Error */}
          {status === "error" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-rose-300">Decryption Failed</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {errorMessage || "The secret payload could not be decrypted. The key might be invalid or corrupted."}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-slate-800 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-600">
        Krypton Vault &middot; Zero-knowledge ephemeral security
      </footer>
    </div>
  );
}