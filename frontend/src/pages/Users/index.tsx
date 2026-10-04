import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Building2,
  Shield,
  Filter,
  X,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { User, UserRole } from '../../util/types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useUsers } from '../../hooks/useUsers';
import { api } from '../../helpers/apiClient';
import { Switch } from '../../components/ui/switch';
import { getDeptAvatar } from '../../util/avatarHelper';

export function Users() {
  const navigate = useNavigate();
  const { data: apiUsers, loading, error, setData } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    email: '',
    phone: '',
    roleId: '',
    departmentId: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptsRes, rolesRes] = await Promise.all([
          api.get<any[]>('/api/Department'),
          api.get<any[]>('/api/Auth/roles')
        ]);
        setDepartments(deptsRes);
        setRoles(rolesRes);
      } catch (err) {
        console.error('Error fetching departments or roles:', err);
      }
    };
    fetchData();
  }, []);

  const users = useMemo<User[]>(() => {
    return (apiUsers || [])
      .map((u: any) => {
        const name = u?.name || u?.Name || '';
        const prename = u?.prename || u?.Prename || '';
        const fullName = `${name} ${prename}`.trim() || u?.username || u?.Username || u?.email || u?.Email || '';
        const email = u?.email || u?.Email || '';
        const rawRole = u?.role || u?.Role || 'candidate';
        const roleStr = typeof rawRole === 'object' && rawRole !== null
          ? (rawRole.description || rawRole.Description || 'candidate')
          : String(rawRole);
        const role = roleStr as UserRole;

        const rawDepartment = u?.department || u?.Department;
        const departmentName = typeof rawDepartment === 'object' && rawDepartment !== null
          ? String(rawDepartment.name || rawDepartment.Name || '')
          : String(rawDepartment || '');

        return {
          id: String(u?.id ?? u?.userId ?? u?.UserId ?? u?.Id ?? ''),
          name: String(fullName),
          email: String(email),
          phone: u?.telephone || u?.Telephone || u?.phone || u?.Phone || '',
          role,
          roleId: u?.roleId || u?.RoleId || (typeof rawRole === 'object' ? (rawRole.id || rawRole.RoleId) : ''),
          avatar: u?.avatar || u?.Avatar,
          department: departmentName,
          departmentId: u?.departmentId || u?.DepartmentId || (typeof rawDepartment === 'object' ? rawDepartment.departmentId : ''),
          etat: u?.etat ?? u?.Etat ?? false,
        };
      })
      .filter(user => {
        const r = user.role.toLowerCase();
        return !r.includes('candidat') && r !== 'candidate';
      });
  }, [apiUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (user.department || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRole = roleFilter === 'all' || user.role.toLowerCase() === roleFilter.toLowerCase();
        const matchesDept = departmentFilter === 'all' || user.department.toLowerCase() === departmentFilter.toLowerCase();
        
        return matchesSearch && matchesRole && matchesDept;
      }
    );
  }, [users, searchTerm, roleFilter, departmentFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, departmentFilter]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/Users/${userId}/status`, { Active: !currentStatus });
      toast.success(`Statut de l'utilisateur mis à jour`);
      
      if (setData) {
        setData((prev: any[]) => prev.map((u: any) => {
          const id = String(u?.id ?? u?.userId ?? u?.UserId ?? u?.Id ?? '');
          if (id === userId) {
            return { ...u, etat: !currentStatus, Etat: !currentStatus };
          }
          return u;
        }));
      }
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    try {
      await api.delete(`/api/Users/${userId}`);
      toast.success('Utilisateur supprimé');
      if (setData) {
        setData((prev: any[]) => prev.filter((u: any) => {
          const id = String(u?.id ?? u?.userId ?? u?.UserId ?? u?.Id ?? '');
          return id !== userId;
        }));
      }
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      phone: user.phone,
      roleId: user.roleId || '',
      departmentId: user.departmentId || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      await api.put(`/api/Users/${editingUser.id}`, {
        Email: editFormData.email,
        Telephone: editFormData.phone,
        RoleId: editFormData.roleId,
        DepartmentId: editFormData.departmentId
      });
      
      toast.success('Utilisateur mis à jour');
      setIsEditModalOpen(false);
      
      if (setData) {
        setData((prev: any[]) => prev.map((u: any) => {
          const id = String(u?.id ?? u?.userId ?? u?.UserId ?? u?.Id ?? '');
          if (id === editingUser.id) {
            const updatedRole = roles.find(r => String(r.id) === String(editFormData.roleId));
            const updatedDept = departments.find(d => String(d.departmentId) === String(editFormData.departmentId));
            return { 
              ...u, 
              email: editFormData.email, 
              Email: editFormData.email,
              phone: editFormData.phone,
              Phone: editFormData.phone,
              roleId: editFormData.roleId,
              RoleId: editFormData.roleId,
              role: updatedRole,
              Role: updatedRole,
              departmentId: editFormData.departmentId,
              DepartmentId: editFormData.departmentId,
              department: updatedDept,
              Department: updatedDept
            };
          }
          return u;
        }));
      }
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getRoleLabel = (role: UserRole) => {
    const labels = {
      admin: 'Administrateur',
      hr: 'Responsable RH',
      rh: 'Responsable RH',
      team_leader: 'Team Leader',
      teamleader: 'Team Leader',
      candidate: 'Candidat',
    };
    return labels[String(role).toLowerCase() as keyof typeof labels] || role;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des Utilisateurs
          </h1>
          <p className="text-muted-foreground font-medium">
            Gérez les comptes, les rôles et le statut d'activité des membres de l'équipe.
          </p>
        </div>
        <button
          onClick={() => navigate('/users/create')}
          className="h-12 px-6 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
        >
          <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Nouvel Utilisateur
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center bg-card/50 p-4 rounded-3xl border border-border/50 backdrop-blur-sm shadow-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-transparent border-none rounded-xl outline-none focus:ring-0 text-lg"
          />
        </div>
        
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 px-3 py-1 bg-background/50 rounded-2xl border border-border/50">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Admin</option>
              <option value="rh">RH</option>
              <option value="teamleader">Team Leader</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-background/50 rounded-2xl border border-border/50">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium"
            >
              <option value="all">Tous les départements</option>
              {departments.map(d => (
                <option key={d.departmentId} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
            <span className="text-sm font-bold">{filteredUsers.length}</span>
            <span className="text-xs font-medium uppercase">Membres</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-2xl shadow-foreground/5 transition-all">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Utilisateur</th>
                <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest hidden md:table-cell">Département</th>
                <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Rôle</th>
                <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Statut</th>
                <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence mode="popLayout">
                {currentUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={getDeptAvatar(user.department, user.role)}
                            alt={user.name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-background shadow-md group-hover:scale-105 transition-transform"
                          />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${user.etat ? 'bg-success' : 'bg-muted'} shadow-sm`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-lg text-foreground truncate">{user.name}</span>
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 opacity-60" />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 hidden md:table-cell">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full text-xs font-bold text-muted-foreground border border-border/50">
                        <Building2 className="w-3.5 h-3.5 text-primary/60" />
                        {user.department || 'Non assigné'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-foreground/80">
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={user.etat}
                          onCheckedChange={() => handleToggleStatus(user.id, !!user.etat)}
                          className="data-[state=checked]:bg-success"
                        />
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${user.etat ? 'text-success' : 'text-muted-foreground'}`}>
                          {user.etat ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-2.5 bg-primary/5 hover:bg-primary/20 text-primary rounded-xl transition-all hover:scale-110 active:scale-95"
                          title="Modifier"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2.5 bg-error/5 hover:bg-error/20 text-error rounded-xl transition-all hover:scale-110 active:scale-95"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="py-32 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-muted mb-6">
                <Search className="w-10 h-10 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-2xl font-black mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-muted-foreground">Essayez d'ajuster vos filtres ou termes de recherche.</p>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-xl font-bold transition-all ${
                  currentPage === i + 1 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-card border border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-3xl font-black tracking-tighter">Modifier Profil</h2>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-secondary rounded-2xl transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Adresse Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full h-14 pl-12 pr-4 bg-secondary/30 border-2 border-border/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Numéro de Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full h-14 pl-12 pr-4 bg-secondary/30 border-2 border-border/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Rôle</label>
                      <select
                        value={editFormData.roleId}
                        onChange={(e) => setEditFormData({ ...editFormData, roleId: e.target.value })}
                        className="w-full h-14 px-4 bg-secondary/30 border-2 border-border/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold appearance-none"
                      >
                        <option value="">Sélectionner...</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.description}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Département</label>
                      <select
                        value={editFormData.departmentId}
                        onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                        className="w-full h-14 px-4 bg-secondary/30 border-2 border-border/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold appearance-none"
                      >
                        <option value="">Sélectionner...</option>
                        {departments.map(d => (
                          <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-8">
                    <button
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 h-16 bg-secondary text-foreground rounded-2xl font-black uppercase tracking-widest hover:bg-secondary/80 transition-all active:scale-95"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleUpdateUser}
                      className="flex-1 h-16 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
