import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Mail, Lock, User as UserIcon, Loader2, ArrowRight } from 'lucide-react';

export function LoginForm() {
  const { login, loginWithEmail, registerWithEmail } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isRegistering) {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {isRegistering && (
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 py-4 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none text-sm font-medium"
              required={isRegistering}
            />
          </div>
        )}
        
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 py-4 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none text-sm font-medium"
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 py-4 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none text-sm font-medium"
            required
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center space-x-2 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-4 text-gray-400 font-black tracking-widest leading-none py-1">Or</span>
        </div>
      </div>

      <button
        onClick={() => { setError(null); login(); }}
        className="w-full bg-white border border-gray-100 text-gray-700 py-4 px-6 rounded-2xl font-bold flex items-center justify-center space-x-3 active:scale-[0.98] transition-all hover:bg-gray-50"
      >
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
        <span>Continue with Google</span>
      </button>

      <div className="text-center">
        <button
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError(null);
          }}
          className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors"
        >
          {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );
}
