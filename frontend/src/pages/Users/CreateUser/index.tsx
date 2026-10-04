import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useCreateUser } from '../../../hooks/useCreateUser';
import { api } from '../../../helpers/apiClient';


export default function CreateUser() {
  const navigate = useNavigate();
  const { createUser, loading, error } = useCreateUser();
  const [name, setName] = useState('');
  const [prename, setPrename] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<{ id: number; description: string }[]>([]);
  const [roleId, setRoleId] = useState<number>(0);
  const [telephone, setTelephone] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fallbackPassword, setFallbackPassword] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get<any[]>('/api/Auth/roles');
        // Les candidats ne sont pas créés ici : ils passent par la candidature / l'invitation.
        const staffRoles = res.filter((r) => r.description !== 'Candidate');
        setRoles(staffRoles);
        if (staffRoles.length > 0) setRoleId(staffRoles[0].id);
      } catch (err) {
        console.error('Error fetching roles:', err);
      }
    };
    fetchRoles();
  }, []);

  const selectedRole = useMemo(() => roles.find((r) => r.id === roleId)?.description ?? 'N/A', [roleId, roles]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setFallbackPassword(null);

    const response = await createUser({
      name,
      prename,
      email,
      roleId,
      telephone: telephone || undefined,
    });

    setSuccessMessage(response?.message || 'User created');
    if (response?.generatedPassword) {
      setFallbackPassword(response.generatedPassword);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Nouvel Utilisateur</h1>
          <p className="text-muted-foreground">Réservé aux administrateurs — crée un compte et envoie les identifiants par e-mail</p>
        </div>
        <button
          onClick={() => navigate('/users')}
          className="h-11 px-5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux utilisateurs
        </button>
      </div>

      <form onSubmit={onSubmit} className="max-w-2xl bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Prénom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Nom</label>
            <input
              value={prename}
              onChange={(e) => setPrename(e.target.value)}
              className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rôle</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(Number(e.target.value))}
              className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Téléphone (optionnel)</label>
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Rôle sélectionné : <span className="font-medium text-foreground">{selectedRole}</span>
        </div>

        {successMessage && (
          <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            {successMessage}
            {fallbackPassword ? (
              <div className="mt-2">
                Mot de passe généré (secours e-mail) : <span className="font-semibold">{fallbackPassword}</span>
              </div>
            ) : null}
          </div>
        )}

        {error ? <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {loading ? 'Création...' : "Créer l'utilisateur et envoyer les identifiants"}
        </button>
      </form>
    </div>
  );
}
