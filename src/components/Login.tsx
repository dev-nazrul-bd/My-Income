import React, { useState } from "react";
import { loginUser } from "../lib/firebase";
import { Lock, Mail, Coins, Eye, EyeOff, Loader } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await loginUser(email, password);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Login failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl p-8"
        id="login-card"
      >
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <span className="text-4xl font-semibold select-none">৳</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white text-center">
            My Income
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 text-center mt-1">
            Sign in to manage your income & collections
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg border border-rose-100 dark:border-rose-950/50">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                placeholder="admin@myincome.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all"
                id="login-email-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all"
                id="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all text-sm disabled:opacity-50"
            id="login-submit-button"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-zinc-800/80 text-center">
          <p className="text-xs text-gray-400 dark:text-zinc-500">
            Forgot sign-up? The login portal will auto-register new email/password accounts instantly on their first attempt.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
