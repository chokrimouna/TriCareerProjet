import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Briefcase, 
  ChevronRight, 
  Edit, 
  Trash2, 
  X,
  LayoutGrid,
  List as ListIcon,
  Mail,
  Shield,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';
import { getDeptAvatar } from '../util/avatarHelper';

interface Department {
  departmentId: number;
  name: string;
}

interface UserMember {
  id: number;
  fullName: string;
  departmentId?: number;
  email?: string;
  role?: string;
}

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<UserMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchDepartments = async () => {
    try {
      const res = await api.get<Department[]>('/api/Department');
      setDepartments(res);
    } catch (e) {
      console.error('Error fetching departments:', e);
      toast.error('Erreur lors du chargement des départements');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get<any[]>('/api/Users');
      const users = res.map(u => {
        const rawRole = u.Role || u.role || '';
        const roleStr = typeof rawRole === 'object'
          ? (rawRole?.Description || rawRole?.description || 'Membre')
          : String(rawRole);
        
        return {
          id: u.userId || u.Id || u.id,
          fullName: `${u.name || ''} ${u.prename || ''}`.trim() || u.email,
          departmentId: u.departmentId || u.DepartmentId,
          email: u.email || u.Email,
          role: roleStr
        };
      });
      setAllUsers(users);
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!newDeptName.trim()) {
      toast.error('Le nom du département est requis');
      return;
    }

    try {
      if (editingDept) {
        await api.put(`/api/Department/${editingDept.departmentId}`, {
          departmentId: editingDept.departmentId,
          name: newDeptName
        });
        toast.success('Département mis à jour');
      } else {
        await api.post('/api/Department', { name: newDeptName });
        toast.success('Département créé');
      }
      setShowModal(false);
      setNewDeptName('');
      setEditingDept(null);
      await fetchDepartments();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer ce département ?')) return;
    try {
      await api.delete(`/api/Department/${id}`);
      toast.success('Département supprimé');
      await fetchDepartments();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredDepts = useMemo(() => {
    return departments.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [departments, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredDepts.length / itemsPerPage);
  const currentDepts = filteredDepts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="p-8 space-y-8 min-h-screen bg-secondary/5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des Départements</h1>
          <p className="text-muted-foreground">
            Structurez votre organisation et visualisez vos équipes.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-card p-1 rounded-xl border border-border shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => {
              setEditingDept(null);
              setNewDeptName('');
              setShowModal(true);
            }}
            className="h-12 px-6 bg-gradient-to-r from-[#DC2626] to-[#F87171] text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau Département
          </button>
        </div>
      </div>

      <div className="flex items-center bg-card border border-border rounded-[2rem] p-2 shadow-card">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-[#DC2626] transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un département..."
            className="w-full h-12 pl-12 pr-4 bg-transparent border-none outline-none focus:ring-0 text-foreground font-medium placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-[#DC2626]/10 border-t-[#DC2626]"></div>
          <p className="font-medium text-muted-foreground">Chargement des départements...</p>
        </div>
      ) : (
        <>
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {currentDepts.map((dept, index) => {
              const deptMembers = allUsers.filter(u => u.departmentId === dept.departmentId);
              const deptTLs = deptMembers.filter(u => {
                const r = u.role?.toLowerCase() || '';
                return r.includes('team leader') || r.includes('teamleader');
              });

              return (
                <motion.div
                  key={dept.departmentId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    setSelectedDept(dept);
                    setShowMembersModal(true);
                  }}
                  className={`bg-card border border-border rounded-[2.5rem] p-8 shadow-card hover-lift group relative overflow-hidden cursor-pointer ${viewMode === 'list' ? 'flex items-center justify-between py-4' : ''}`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#DC2626]/5 to-transparent rounded-bl-full -z-10" />
                  
                  <div className={viewMode === 'grid' ? "flex items-start justify-between mb-8" : "flex items-center gap-6"}>
                    <img 
                      src={getDeptAvatar(dept.name)} 
                      alt={dept.name}
                      className="w-20 h-20 rounded-full object-cover shadow-xl group-hover:scale-110 transition-transform border-4 border-white bg-white"
                    />
                    {viewMode === 'grid' && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDept(dept);
                            setNewDeptName(dept.name);
                            setShowModal(true);
                          }}
                          className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(dept.departmentId, e)}
                          className="p-2 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={viewMode === 'list' ? 'flex-1 ml-6' : ''}>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-[#DC2626] transition-colors">{dept.name}</h3>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{deptMembers.length} Membre(s) total</span>
                      </div>
                      <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
                        <Shield className="w-4 h-4 text-primary" />
                        <span>{deptTLs.length} Team Leader(s)</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Responsables :</p>
                      <div className="flex flex-wrap gap-2">
                        {deptTLs.length > 0 ? deptTLs.map(tl => (
                          <div key={tl.id} className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full text-xs font-medium border border-border/50">
                            <img 
                              src={getDeptAvatar(dept.name, tl.role)} 
                              alt={tl.fullName} 
                              className="w-6 h-6 rounded-full object-cover border border-primary/20"
                            />
                            {tl.fullName}
                          </div>
                        )) : (
                          <p className="text-xs italic text-muted-foreground">Aucun responsable assigné</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {viewMode === 'grid' && (
                    <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#DC2626]">
                        <Users className="w-4 h-4" />
                        Voir toute l'équipe ({deptMembers.length})
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                    </div>
                  )}

                  {viewMode === 'list' && (
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDept(dept);
                          setNewDeptName(dept.name);
                          setShowModal(true);
                        }}
                        className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(dept.departmentId, e)}
                        className="p-2 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-12 pb-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 rounded-xl font-bold transition-all shadow-sm ${
                      currentPage === i + 1 
                        ? 'bg-primary text-white scale-110' 
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
                className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal for editing/creating department */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">{editingDept ? 'Modifier le Département' : 'Nouveau Département'}</h2>
                  <button onClick={() => setShowModal(false)} className="p-3 hover:bg-secondary rounded-2xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Nom du département</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        placeholder="Ex: IT & Développement"
                        className="w-full h-12 pl-12 pr-4 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 h-12 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 h-12 bg-[#DC2626] text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                      {editingDept ? 'Mettre à jour' : 'Créer'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for viewing department members */}
      <AnimatePresence>
        {showMembersModal && selectedDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMembersModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <img 
                      src={getDeptAvatar(selectedDept.name)} 
                      alt={selectedDept.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                    />
                    <div>
                      <h2 className="text-2xl font-bold">{selectedDept.name}</h2>
                      <p className="text-sm text-muted-foreground">Liste complète de l'équipe</p>
                    </div>
                  </div>
                  <button onClick={() => setShowMembersModal(false)} className="p-3 hover:bg-secondary rounded-2xl transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                  {(() => {
                    const members = allUsers.filter(u => u.departmentId === selectedDept.departmentId);
                    return members.length > 0 ? members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/50 hover:bg-secondary/40 transition-colors group">
                        <div className="flex items-center gap-4">
                          <img 
                            src={getDeptAvatar(selectedDept.name, member.role)} 
                            className="w-12 h-12 rounded-full object-cover border border-primary/20 shadow-sm"
                            alt={member.fullName}
                          />
                          <div>
                            <p className="font-bold text-foreground">{member.fullName}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {member.email}
                              </span>
                              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-tighter">
                                {member.role}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    )) : (
                      <div className="py-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">Aucun membre dans ce département.</p>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <button
                    onClick={() => setShowMembersModal(false)}
                    className="w-full h-12 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
