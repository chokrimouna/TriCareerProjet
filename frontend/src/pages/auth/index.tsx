import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Phone, Sparkles, ArrowRight, ArrowLeft, ChevronDown, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useLogin } from '../../hooks/useLogin';
import { useRegister } from '../../hooks/useRegister';
import { useRoles } from '../../hooks/useRoles';

export function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRegisterInitial = location.pathname === '/register';
  const [isLogin, setIsLogin] = useState(!isRegisterInitial);

  // Read optional ?redirect= param from the URL (used by email exam links)
  const redirectParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('redirect') || '';
  }, [location.search]);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const login = useLogin();

  // Register State
  const [registerData, setRegisterData] = useState({
    name: '',
    prename: '',
    email: '',
    password: '',
    telephone: '',
    roleId: '',
  });
  const { register, loading: isRegisterLoading, error: registerError } = useRegister();
  const { roles, loading: rolesLoading } = useRoles();

  // Unique session key for input names to break browser autofill associations
  const [sessionKey] = useState(Math.random().toString(36).substring(2, 8));

  const filteredRoles = useMemo(() => {
    const allowed = ['RH', 'TeamLeader', 'Candidate'];
    return roles.filter((r) => allowed.includes(r.Description));
  }, [roles]);

  useEffect(() => {
    setIsLogin(location.pathname !== '/register');
  }, [location.pathname]);

  useEffect(() => {
    if (registerError) toast.error(registerError);
  }, [registerError]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginLoading) return;
    setIsLoginLoading(true);
    try {
      // Pass the redirect target (if coming from an exam email link)
      await login(loginEmail, loginPassword, redirectParam || undefined);
      toast.success('Connexion réussie !');
    } catch (error) {
      toast.error('Email ou mot de passe incorrect');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterLoading) return;
    const parsedRoleId = Number(registerData.roleId);
    if (!parsedRoleId) {
      toast.error('Veuillez sélectionner un rôle');
      return;
    }
    await register(
      registerData.name,
      registerData.prename,
      registerData.email,
      registerData.password,
      parsedRoleId,
      registerData.telephone || undefined
    );
  };

  const toggleAuth = () => {
    const newPath = isLogin ? '/register' : '/login';
    navigate(newPath);
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-fun selection:bg-[#DC2626]/10 overflow-hidden">

      {/* Main Auth Viewport */}
      <div className="flex-1 w-full relative flex flex-col lg:flex-row h-screen">

        {/* LOGIN FORM SECTION */}
        <div
          className={`
            absolute inset-0 lg:w-1/2 h-full flex flex-col transition-all duration-700 ease-in-out
            ${isLogin ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none lg:translate-x-12'}
          `}
        >
          <div className="w-full h-full overflow-y-auto flex flex-col justify-center items-center p-6 md:p-12 lg:p-16">
            <div className="max-w-md w-full">
              <div className="mb-12">
                <h2 className="text-5xl lg:text-6xl font-bold text-gray-800 tracking-tighter mb-4">Bonjour !</h2>
                <p className="text-gray-500 font-normal text-lg lg:text-xl">
                  {redirectParam ? 'Connectez-vous pour accéder à votre test.' : 'Ravis de vous revoir. Prêt à recruter ?'}
                </p>
                {redirectParam && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold">
                    <span>🎯</span> Vous serez redirigé vers votre test après connexion.
                  </div>
                )}
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6" autoComplete="off">
                {/* Honey-pot for autofill suppression */}
                <input type="text" name="prevent_autofill" style={{ display: 'none' }} />
                <input type="password" name="prevent_autofill_p" style={{ display: 'none' }} />

                <div className="space-y-2">
                  <label className="text-s font-normal text-gray-500 ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#DC2626] transition-colors" />
                    <input
                      type="email"
                      name={`field_e_${sessionKey}`}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full h-14 pl-12 pr-4 bg-gray-50/50 border border-gray-150 rounded-2xl outline-none focus:bg-white focus:border-[#DC2626]/30 transition-all text-gray-700 font-medium"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-s font-normal text-gray-500 ml-1">Mot de passe</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#DC2626] transition-colors" />
                    <input
                      type="password"
                      name={`field_p_${sessionKey}`}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-14 pl-12 pr-4 bg-gray-50/50 border border-gray-150 rounded-2xl outline-none focus:bg-white focus:border-[#DC2626]/30 transition-all text-gray-700 font-medium"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full h-11 bg-[#DC2626] text-white rounded-xl font-medium text-base hover:bg-[#b91c1c] hover:shadow-xl hover:shadow-[#DC2626]/10 transition-all active:scale-[0.98] mt-4"
                >
                  {isLoginLoading ? 'En cours...' : 'Se connecter'}
                </button>
              </form>

              <div className="mt-8 text-center lg:hidden">
                <button onClick={toggleAuth} className="text-sm font-semibold text-[#DC2626]">Créer un compte</button>
              </div>
            </div>
          </div>
        </div>

        {/* REGISTER FORM SECTION */}
        <div
          className={`
            absolute inset-0 lg:left-1/2 lg:w-1/2 h-full flex flex-col transition-all duration-700 ease-in-out
            ${!isLogin ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none lg:-translate-x-12'}
          `}
        >
          <div className="w-full h-full overflow-y-auto flex flex-col items-center p-6 md:p-12 lg:p-16">
            <div className="max-w-md w-full my-auto py-12">
              <div className="mb-10">
                <h2 className="text-5xl lg:text-7xl font-bold text-gray-800 tracking-tighter mb-4">On y va ?</h2>
                <p className="text-gray-400 font-medium text-lg lg:text-xl">Rejoignez le futur du recrutement TriCareer.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4" autoComplete="off">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Nom</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[#DC2626] transition-colors" />
                      <input
                        type="text"
                        name={`field_n_${sessionKey}`}
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        placeholder="Votre nom"
                        className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#DC2626]/30 transition-all text-gray-700 font-medium"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Prénom</label>
                    <input
                      type="text"
                      name={`field_f_${sessionKey}`}
                      value={registerData.prename}
                      onChange={(e) => setRegisterData({ ...registerData, prename: e.target.value })}
                      placeholder="Prénom"
                      className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#DC2626]/30 transition-all text-gray-700 font-medium"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Email professionnel</label>
                  <input
                    type="email"
                    name={`field_re_${sessionKey}`}
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    placeholder="email@entreprise.com"
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#DC2626]/30 transition-all text-gray-700 font-medium"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Mot de passe</label>
                  <input
                    type="password"
                    name={`field_rp_${sessionKey}`}
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Min. 8 caractères"
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#DC2626]/30 transition-all text-gray-700 font-medium"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Rôle</label>
                  <div className="relative">
                    <select
                      value={registerData.roleId}
                      onChange={(e) => setRegisterData({ ...registerData, roleId: e.target.value })}
                      className="w-full h-11 pl-4 pr-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#DC2626]/30 transition-all text-gray-700 font-medium appearance-none cursor-pointer"
                      required
                    >
                      <option value="">{rolesLoading ? '...' : 'Sélectionnez un rôle'}</option>
                      {filteredRoles.map((role) => (
                        <option key={role.Role_Id} value={role.Role_Id}>
                          {role.Description === 'Candidate' ? 'Candidat' : role.Description}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Téléphone</label>
                  <input
                    type="tel"
                    name={`field_t_${sessionKey}`}
                    value={registerData.telephone}
                    onChange={(e) => setRegisterData({ ...registerData, telephone: e.target.value })}
                    placeholder="+216 --"
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#DC2626]/30 transition-all text-gray-700 font-medium"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRegisterLoading}
                  className="w-full h-11 bg-[#DC2626] text-white rounded-xl font-medium text-base hover:bg-[#b91c1c] transition-all active:scale-[0.98] mt-4"
                >
                  {isRegisterLoading ? 'Création...' : 'Créer un compte'}
                </button>
              </form>

              <div className="mt-8 text-center lg:hidden">
                <button onClick={toggleAuth} className="text-sm font-semibold text-[#DC2626]">Déjà inscrit ? Connexion</button>
              </div>
            </div>
          </div>
        </div>

        {/* SLIDING DECOR PANEL */}
        <motion.div
          initial={false}
          animate={{
            x: isLogin ? '100%' : '0%',
          }}
          transition={{ type: "spring", stiffness: 35, damping: 14 }}
          className="absolute top-0 left-0 w-1/2 h-full z-20 hidden lg:block pointer-events-auto"
        >
          <div className="w-full h-full relative overflow-hidden flex flex-col justify-center items-center text-center p-16 text-white group">

            {/* VIBRANT ANIMATED GRADIENT BACKGROUND - BALANCED BRIGHTNESS */}
            <motion.div
              animate={{
                background: [
                  'linear-gradient(to bottom right, #DC2626, #EF4444, #7C3AED)',
                  'linear-gradient(to bottom right, #EF4444, #7C3AED, #DC2626)',
                  'linear-gradient(to bottom right, #7C3AED, #DC2626, #EF4444)',
                ],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 z-0"
            />

            {/* SMOOTH ANIMATED WAVES & SHAPES */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              {/* Floating Orbs */}
              <motion.div
                animate={{ y: [0, -30, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[10%] left-[10%] w-64 h-64 bg-white/5 rounded-full blur-[80px]"
              />
              <motion.div
                animate={{ y: [0, 30, 0], x: [0, -20, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]"
              />

              <motion.svg
                animate={{
                  x: [-30, 30, -30],
                  y: [0, 15, 0],
                  rotate: [0, 2, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-15%] left-[-15%] w-[180%] h-[90%] opacity-35" viewBox="0 0 100 100" preserveAspectRatio="none"
              >
                <path d="M0,50 C30,80 70,20 100,50 L100,100 L0,100 Z" fill="white" />
              </motion.svg>
              <motion.svg
                animate={{
                  x: [30, -30, 30],
                  y: [0, -15, 0],
                  rotate: [0, -2, 0]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-15%] right-[-15%] w-[180%] h-[90%] opacity-25 rotate-180" viewBox="0 0 100 100" preserveAspectRatio="none"
              >
                <path d="M0,50 C30,80 70,20 100,50 L100,100 L0,100 Z" fill="white" />
              </motion.svg>
            </div>

            <div className="relative z-10 space-y-12">
              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div
                    key="msg-login"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="space-y-6"
                  >
                    <h1 className="text-7xl font-bold tracking-tighter leading-none">Bon retour !</h1>
                    <p className="text-xl text-white/90 font-medium max-w-sm mx-auto leading-relaxed">Connectez-vous pour continuer votre aventure avec TriCareer.</p>
                    <button
                      onClick={toggleAuth}
                      className="h-11 px-10 rounded-full border-2 border-white/30 hover:bg-white hover:text-[#DC2626] transition-all font-medium text-sm flex items-center justify-center gap-4 mx-auto"
                    >
                      <ArrowRight className="w-5 h-5" /> Créer un compte
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="msg-register"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="space-y-6"
                  >
                    <h1 className="text-7xl font-bold tracking-tighter leading-none">Bienvenue à bord</h1>
                    <p className="text-xl text-white/90 font-medium max-w-sm mx-auto leading-relaxed">Créez votre compte et profitez d’une expérience fluide et professionnelle.</p>
                    <button
                      onClick={toggleAuth}
                      className="h-11 px-10 rounded-full border-2 border-white/30 hover:bg-white hover:text-[#DC2626] transition-all font-medium text-sm flex items-center justify-center gap-4 mx-auto"
                    >
                      <ArrowLeft className="w-5 h-5" /> Connexion
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="absolute bottom-16 left-0 w-full flex items-center justify-center gap-3 opacity-30">
              <Sparkles className="w-5 h-5" />
              <span className="text-base font-bold tracking-[0.3em] uppercase">TriCareer</span>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap');
        .font-fun {
          font-family: 'Lexend', sans-serif !important;
        }
      `}</style>
    </div>
  );
}
