import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useRegister } from '../../hooks/useRegister';
import { useRoles } from '../../hooks/useRoles';

export function Register() {
  const [formData, setFormData] = useState({
    name: '',
    prename: '',
    email: '',
    password: '',
    telephone: '',
    roleId: '',
  });

  const { register, loading, error } = useRegister();
  const { roles, loading: rolesLoading } = useRoles();
  console.log('Roles in component:', roles);

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const desc = (r.Description || '').toLowerCase().replace(/\s+/g, '');
      return desc === 'rh' || desc === 'hr' || desc === 'teamleader' || desc === 'tl';
    });
  }, [roles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const parsedRoleId = Number(formData.roleId);
    if (!parsedRoleId) {
      toast.error('Veuillez selectionner un role');
      return;
    }

    await register(
      formData.name,
      formData.prename,
      formData.email,
      formData.password,
      parsedRoleId,
      formData.telephone || undefined,
    );
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-bold text-xl">TC</span>
            </div>
            <span className="text-2xl font-bold text-white">TriCareer</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">Rejoignez TriCareer</h1>
          <p className="text-xl text-white/90">Votre parcours professionnel commence ici</p>
        </div>

        <div className="relative z-10 text-white/70 text-sm">© 2026 TriCareer. Propulse par TriWeb.</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Creer un compte</h2>
            <p className="text-muted-foreground">Inscription RH et TeamLeader uniquement</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom"
                  className="w-full h-12 pl-11 pr-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Prenom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.prename}
                  onChange={(e) => setFormData({ ...formData, prename: e.target.value })}
                  placeholder="Prenom"
                  className="w-full h-12 pl-11 pr-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nom@exemple.com"
                  className="w-full h-12 pl-11 pr-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full h-12 pl-11 pr-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">{rolesLoading ? 'Chargement des roles...' : 'Selectionnez un role'}</option>
                  {filteredRoles.map((role) => (
                    <option key={role.Role_Id} value={role.Role_Id}>
                      {role.Description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Telephone (optionnel)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="+216 00 000 000"
                  className="w-full h-12 pl-11 pr-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creation...' : 'Creer mon compte'}
            </button>
            {error ? <p className="text-sm text-error mt-2">{error}</p> : null}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Deja inscrit ?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
