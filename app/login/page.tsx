
"use client";

import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Music2,
} from "lucide-react";
import { createSupabaseBrowserClient } from "../../lib/supabase-client";
export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createSupabaseBrowserClient(),
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError("Email atau password salah. Silakan periksa kembali.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server. Periksa koneksi internet kamu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-white text-slate-900">
      {/* LEFT SIDE */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#111D35] p-12 text-white lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-3">
            <AudioLines size={28} />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-wider">
              WEB MUSIK GBIS
            </h1>
            <p className="text-xs text-slate-400">
              Music Management System
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
            <Music2 size={48} className="text-blue-400" />
          </div>

          <h2 className="text-4xl font-bold leading-tight">
            Kelola Musik Gereja dengan Mudah,
            <span className="text-blue-400">
              {" "}Kelola praise and worship.
            </span>
          </h2>

          <p className="mt-6 leading-7 text-slate-400">
            Kelola seluruh kebutuhan file musik sequencer,
            cue, click, dan reference dalam satu tempat
            yang terorganisir.
          </p>

          <div className="mt-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
              <ShieldCheck size={21} />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Secure Admin Access
              </p>
              <p className="text-xs text-slate-400">
                Akses khusus administrator
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          © 2026 Web Musik GBIS. All rights reserved.
        </p>
      </section>

      {/* RIGHT SIDE */}
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <AudioLines size={32} />
            </div>

            <h1 className="text-xl font-bold text-[#111D35]">
              WEB MUSIK GBIS
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Music Management System
            </p>
          </div>

          <div className="mb-8">
            <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600">
              <ShieldCheck size={15} className="mr-2" />
              ADMINISTRATOR ACCESS
            </div>

            <h2 className="text-3xl font-bold text-[#111D35]">
              Selamat Datang!
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Silakan masuk menggunakan akun administrator
              untuk mengakses Web Musik GBIS.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email Administrator
              </label>

              <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                <Mail size={19} className="text-slate-400" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="username"
                  className="w-full bg-transparent px-3 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                <LockKeyhole size={19} className="text-slate-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  className="w-full bg-transparent px-3 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Tampilkan password"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded accent-blue-600"
                />
                Ingat saya
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sedang masuk..." : "Masuk ke Dashboard"}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-xs leading-6 text-slate-400">
              Halaman ini hanya diperuntukkan bagi administrator.
              Pembuatan akun dikelola oleh admin.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
