import React, { useState } from 'react';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  onOpenSqlModal?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Por favor, informe seu email e senha.');
      return;
    }

    setLoading(true);

    if (isSignUpMode) {
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Conta criada com sucesso! Verifique sua caixa de entrada ou faça login.');
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Email ou senha inválidos. Se este é o primeiro acesso, clique em "Cadastrar primeiro usuário" abaixo.');
        } else {
          setErrorMessage(error.message);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1B4A] flex flex-col justify-between items-center p-4 sm:p-6 text-white selection:bg-white selection:text-[#0B1B4A]">
      {/* Spacer top */}
      <div className="w-full max-w-md h-4" />

      {/* Main Login Card */}
      <div className="w-full max-w-md my-auto">
        {/* Logo & Identity */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            MAJOR
          </h1>
          <div className="h-0.5 w-10 bg-white mx-auto my-2 rounded-full" />
          <p className="text-[11px] text-white/90 font-bold tracking-[0.2em] uppercase">
            Assistência Técnica
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          <div className="mb-6 pb-2 border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-bold text-[#0B1B4A]">
              {isSignUpMode ? 'Cadastrar Primeiro Técnico' : 'Acesso do Técnico'}
            </h2>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium leading-relaxed">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium leading-relaxed">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tecnico@major.com.br"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200/80 bg-slate-50/70 focus:bg-white focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200/80 bg-slate-50/70 focus:bg-white focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#0B1B4A] hover:bg-[#142866] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2 active:scale-[0.99]"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUpMode ? 'Criar Usuário Técnico' : 'Entrar'}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and First Admin Registration */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUpMode(!isSignUpMode);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs text-slate-600 hover:text-[#0B1B4A] font-semibold underline underline-offset-4"
            >
              {isSignUpMode
                ? 'Já possui cadastro? Clique para Entrar'
                : 'Primeira vez no app? Cadastrar primeiro usuário'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-400 py-2">
        <p>© MAJOR Assistência Técnica</p>
      </div>
    </div>
  );
};
