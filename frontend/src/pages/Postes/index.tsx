import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, X, ExternalLink, MapPin, Calendar, Briefcase, Filter, Power, LayoutGrid, List, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../helpers/apiClient';

type Poste = {
  JobPostingId: number;
  jobPostingId?: number;
  PositionTitle?: string;
  positionTitle?: string;
  Description?: string;
  description?: string;
  Requirements?: string;
  requirements?: string;
  DatePosted?: string;
  datePosted?: string;
  ApplicationDeadline?: string;
  applicationDeadline?: string;
  Department?: string;
  department?: string;
  ContractType?: string;
  contractType?: string;
  ExperienceLevel?: string;
  experienceLevel?: string;
  Salary?: string;
  salary?: string;
  IsActive?: boolean;
  isActive?: boolean;
  Etat?: boolean;
  etat?: boolean;
  Missions?: string;
  missions?: string;
  Skills?: string;
  skills?: string;
  Experience?: string;
  experience?: string;
  Location?: string;
  location?: string;
  Applications?: any[];
  DepartmentId?: number;
  departmentId?: number;
};

type Department = {
  departmentId?: number;
  DepartmentId?: number;
  name?: string;
  Name?: string;
};

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Freelance'];
const EXPERIENCE_LEVELS = ['Junior', 'Intermédiaire', 'Senior'];

const defaultForm = {
  JobPostingId: 0,
  PositionTitle: '',
  Description: '',
  Department: 'IT',
  Requirements: '',
  ExperienceLevel: 'Junior',
  ContractType: 'CDI',
  Salary: '',
  ApplicationDeadline: '',
  IsActive: true,
  DepartmentId: undefined as number | undefined,
  Missions: '',
  Skills: '',
  Experience: '',
  Location: '',
};

export default function Postes() {
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Tous');
  const [departementFilter, setDepartementFilter] = useState('Tous');
  const [contractFilter, setContractFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPoste, setSelectedPoste] = useState<Poste | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [posteToDelete, setPosteToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const fetchPostes = async () => {
    setLoading(true);
    try {
      const postesRes = await api.get<any[]>('/api/JobPosting').catch(e => { console.error('Jobs error:', e); return []; });
      setPostes(Array.isArray(postesRes) ? postesRes : []);
    } catch (e) { console.error(e); }

    try {
      const appsRes = await api.get<any[]>('/api/Application/getAllApps').catch(e => { console.error('Apps error:', e); return []; });
      setAllApplications(Array.isArray(appsRes) ? appsRes : []);
    } catch (e) { console.error(e); }

    try {
      const deptsRes = await api.get<Department[]>('/api/Department').catch(e => { console.error('Depts error:', e); return []; });
      setDepartments(Array.isArray(deptsRes) ? deptsRes : []);
    } catch (e) { console.error(e); }

    setLoading(false);
  };

  useEffect(() => {
    void fetchPostes();
  }, []);



  const filteredPostes = useMemo(() => {
    return postes.filter((p) => {
      const title = String(p.PositionTitle ?? p.positionTitle ?? p.JobTitle ?? p.jobTitle ?? '').toLowerCase();
      const description = String(p.Description ?? '').toLowerCase();
      const depId = p.DepartmentId ?? p.departmentId;
      const matchDep = departementFilter === 'Tous' || String(depId) === departementFilter;
      const contract = String(p.ContractType ?? 'CDI');
      const statusValue = p.IsActive ?? p.isActive ?? p.Etat ?? p.etat ?? true;
      const status = statusValue === false ? 'Fermé' : 'Ouvert';
      const q = search.trim().toLowerCase();

      const matchSearch = !q || title.includes(q) || description.includes(q);
      const matchContract = contractFilter === 'Tous' || contract === contractFilter;
      const matchStatus = statusFilter === 'Tous' || status === statusFilter;

      let matchDate = true;
      if (dateFilter !== 'Tous' && p.DatePosted) {
        const postDate = new Date(p.DatePosted);
        const now = new Date();
        const diffMs = now.getTime() - postDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateFilter === '24h') matchDate = diffDays <= 1;
        else if (dateFilter === '7j') matchDate = diffDays <= 7;
        else if (dateFilter === '30j') matchDate = diffDays <= 30;
      }

      return matchSearch && matchDep && matchContract && matchStatus && matchDate;
    });
  }, [postes, search, departementFilter, contractFilter, statusFilter, dateFilter]);

  const openCreate = () => {
    setSelectedPoste(null);
    setFormData(defaultForm);
    setShowFormModal(true);
  };

  const openEdit = (poste: Poste) => {
    const jobPostingId = poste.JobPostingId || poste.jobPostingId || 0;
    setSelectedPoste(poste);
    setFormData({
      JobPostingId: jobPostingId,
      PositionTitle: poste.PositionTitle ?? poste.positionTitle ?? '',
      Description: poste.Description ?? poste.description ?? '',
      DepartmentId: poste.DepartmentId ?? poste.departmentId,
      Requirements: poste.Requirements ?? poste.requirements ?? '',
      ExperienceLevel: poste.ExperienceLevel ?? poste.experienceLevel ?? 'Intermédiaire',
      ContractType: poste.ContractType ?? poste.contractType ?? 'CDI',
      Salary: poste.Salary ?? poste.salary ?? '',
      ApplicationDeadline: (poste.ApplicationDeadline || poste.applicationDeadline)?.split('T')[0] ?? '',
      IsActive: (poste.IsActive ?? poste.isActive ?? poste.Etat ?? poste.etat) !== false,
      Missions: poste.Missions ?? poste.missions ?? '',
      Skills: poste.Skills ?? poste.skills ?? '',
      Experience: poste.Experience ?? poste.experience ?? '',
      Location: poste.Location ?? poste.location ?? '',
    });
    setShowFormModal(true);
  };

  const [saving, setSaving] = useState(false);

  const savePoste = async () => {
    if (!formData.PositionTitle.trim()) {
      toast.error('Le titre du poste est requis');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        JobPostingId: formData.JobPostingId,
        PositionTitle: formData.PositionTitle,
        Description: formData.Description || '',
        DepartmentId: formData.DepartmentId ?? null,
        Requirements: formData.Requirements || '',
        ApplicationDeadline: formData.ApplicationDeadline ? new Date(formData.ApplicationDeadline).toISOString() : null,
        DatePosted: selectedPoste?.DatePosted || new Date().toISOString(),
        IsActive: formData.IsActive,
        ContractType: formData.ContractType,
        Salary: formData.Salary,
        ExperienceLevel: formData.ExperienceLevel,
        Missions: formData.Missions || '',
        Skills: formData.Skills || '',
        Experience: formData.Experience || '',
        Location: formData.Location || '',
      };
      if (selectedPoste) {
        const id = selectedPoste.JobPostingId || selectedPoste.jobPostingId;
        await api.put(`/api/JobPosting/${id}`, payload);
        toast.success('Poste modifié avec succès');
      } else {
        await api.post('/api/JobPosting', payload);
        toast.success('Poste ajouté avec succès');
      }
      setShowFormModal(false);
      await fetchPostes();
    } catch (e: any) {
      console.error('[savePoste] error:', e);
      toast.error(e?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deletePoste = async (id: number) => {
    if (!confirm('Supprimer ce poste ?')) return;
    try {
      await api.delete(`/api/JobPosting/${id}`);
      toast.success('Poste supprimé');
      await fetchPostes();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur suppression');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Postes</h1>
          <p className="text-muted-foreground">Publiez et gérez vos offres d'emploi</p>
        </div>
        <button
          onClick={openCreate}
          className="h-12 px-6 bg-gradient-to-r from-[#EF4444] to-[#F87171] text-white rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouveau poste
        </button>
      </div>

      {/* KPI Cards — Dashboard style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            label: 'Total des postes',
            value: postes.length,
            icon: Briefcase,
            color: 'primary',
          },
          {
            label: 'Postes actifs',
            value: postes.filter(p => (p.IsActive ?? p.isActive ?? p.Etat ?? p.etat) !== false).length,
            icon: Power,
            color: 'emerald',
          },
          {
            label: 'Candidatures reçues',
            value: allApplications.length,
            icon: Users,
            color: 'blue',
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform ${
                stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight leading-none">{stat.value}</p>
                <p className="text-sm font-semibold text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-3 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un poste..."
              className="w-full h-12 pl-12 pr-4 bg-transparent border-none outline-none focus:ring-0 text-foreground font-medium placeholder:text-muted-foreground"
            />
          </div>
          <div className="hidden lg:block w-px h-8 bg-border col-span-1 mx-auto"></div>
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-3">

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)} 
                className="w-full h-12 pl-10 pr-3 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-medium text-sm"
              >
                <option value="Tous">Toutes Dates</option>
                <option value="24h">24 dernières heures</option>
                <option value="7j">7 derniers jours</option>
                <option value="30j">30 derniers jours</option>
              </select>
            </div>
            <select value={departementFilter} onChange={(e) => setDepartementFilter(e.target.value)} className="h-12 px-3 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm">
              <option value="Tous">Tous les départements</option>
              {departments.map((d) => (
                <option key={d.departmentId ?? d.DepartmentId} value={d.departmentId ?? d.DepartmentId}>
                  {d.name ?? d.Name}
                </option>
              ))}
            </select>
            <select value={contractFilter} onChange={(e) => setContractFilter(e.target.value)} className="h-12 px-3 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm">
              <option value="Tous">Contrats</option>
              {CONTRACT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-12 px-3 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm">
              <option value="Tous">Statuts</option>
              <option value="Ouvert">Ouvert</option>
              <option value="Fermé">Fermé</option>
            </select>
          </div>
          <div className="lg:col-span-1 flex justify-end">
            <div className="flex bg-secondary/50 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
          <AnimatePresence mode="popLayout">
            {filteredPostes.map((p, idx) => {
              const isOpen = (p.IsActive ?? p.isActive ?? p.Etat ?? p.etat) !== false;
              const jobPostingId = p.JobPostingId || p.jobPostingId;
              const candidatureCount = allApplications.filter(app => (app.jobPostingId || app.JobPostingId) == jobPostingId).length;
              
              if (viewMode === 'list') {
                return (
                  <motion.div
                    key={jobPostingId ?? `job-${idx}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
                            {p.PositionTitle ?? p.positionTitle ?? p.JobTitle ?? p.jobTitle ?? 'Poste sans titre'}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {isOpen ? 'Ouvert' : 'Fermé'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs font-medium">
                            {departments.find(d => (d.departmentId ?? d.DepartmentId) === (p.DepartmentId || p.departmentId))?.name || departments.find(d => (d.departmentId ?? d.DepartmentId) === (p.DepartmentId || p.departmentId))?.Name || 'Sans département'}
                          </span>
                          <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs font-medium">
                            {p.ContractType ?? p.contractType ?? 'CDI'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 md:px-6 md:border-x border-border/50">
                      <div className="text-center">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Candidats</p>
                        <p className="text-xl font-bold">{candidatureCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Publié le</p>
                        <p className="text-sm font-semibold">{new Date(p.DatePosted ?? p.datePosted ?? new Date().toISOString()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      {(p.ApplicationDeadline || p.applicationDeadline) && (
                        <div className="text-center">
                          <p className="text-xs font-medium text-red-500 mb-0.5">Date limite</p>
                          <p className="text-sm font-bold text-red-600">{new Date(p.ApplicationDeadline || p.applicationDeadline!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setSelectedPoste(p); setShowViewModal(true); }} className="h-9 px-4 bg-secondary hover:bg-[#DC2626] hover:text-white text-foreground rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"><Eye className="w-4 h-4" />Voir</button>
                      <button onClick={() => openEdit(p)} className="h-9 w-9 bg-secondary hover:bg-primary hover:text-white rounded-xl flex items-center justify-center transition-all" title="Modifier"><Edit className="w-4 h-4" /></button>
                      <button onClick={async () => { 
                        try { 
                          const s = (p.IsActive ?? p.isActive) !== false; 
                          const payload = {
                            JobPostingId: p.JobPostingId || p.jobPostingId,
                            PositionTitle: p.PositionTitle || p.positionTitle,
                            Description: p.Description || p.description,
                            DepartmentId: p.DepartmentId || p.departmentId,
                            Requirements: p.Requirements || p.requirements,
                            DatePosted: p.DatePosted || p.datePosted,
                            ApplicationDeadline: p.ApplicationDeadline || p.applicationDeadline,
                            ContractType: p.ContractType || p.contractType,
                            Salary: p.Salary || p.salary,
                            ExperienceLevel: p.ExperienceLevel || p.experienceLevel,
                            Missions: p.Missions || p.missions,
                            Skills: p.Skills || p.skills,
                            Experience: p.Experience || p.experience,
                            Location: p.Location || p.location,
                            IsActive: !s
                          };
                          await api.put(`/api/JobPosting/${p.JobPostingId || p.jobPostingId}`, payload); 
                          toast.success(s ? 'Désactivé' : 'Activé'); 
                          await fetchPostes(); 
                        } catch (e: any) { 
                          toast.error(e?.message); 
                        } 
                      }} className={`h-9 w-9 ${isOpen ? 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'} rounded-xl flex items-center justify-center transition-all`} title={isOpen ? 'Désactiver' : 'Activer'}><Power className="w-4 h-4" /></button>
                      <button onClick={() => deletePoste(p.JobPostingId || p.jobPostingId!)} className="h-9 w-9 bg-error/10 text-error hover:bg-error hover:text-white rounded-xl flex items-center justify-center transition-all" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                );
              }

              // GRID VIEW
              return (
                <motion.div
                  key={jobPostingId ?? `job-${idx}`}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift hover:border-primary/50 transition-all relative overflow-hidden group flex flex-col h-full"
                >
                  {/* Hover-reveal CRUD actions (Tests style) */}
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="flex items-center gap-1 bg-white/90 backdrop-blur shadow-lg rounded-xl p-1 border border-border">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedPoste(p); setShowViewModal(true); }} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Voir les détails"><Eye className="w-4 h-4" /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Modifier"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={async (e) => { 
                        e.stopPropagation(); 
                        try { 
                          const s = (p.IsActive ?? p.isActive) !== false; 
                          const payload = {
                            JobPostingId: p.JobPostingId || p.jobPostingId,
                            PositionTitle: p.PositionTitle || p.positionTitle,
                            Description: p.Description,
                            DepartmentId: p.DepartmentId || p.departmentId,
                            Requirements: p.Requirements,
                            DatePosted: p.DatePosted,
                            ApplicationDeadline: p.ApplicationDeadline,
                            IsActive: !s
                          };
                          await api.put(`/api/JobPosting/${p.JobPostingId || p.jobPostingId}`, payload); 
                          toast.success(s ? 'Désactivé' : 'Activé'); 
                          await fetchPostes(); 
                        } catch (err: any) { 
                          toast.error(err?.message); 
                        } 
                      }} className={`p-2 rounded-lg transition-colors ${isOpen ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`} title={isOpen ? 'Désactiver' : 'Activer'}><Power className="w-4 h-4" /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); deletePoste(p.JobPostingId || p.jobPostingId!); }} className="p-2 rounded-lg text-error hover:bg-error/10 transition-colors" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {isOpen ? 'Ouvert' : 'Fermé'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors" title={p.PositionTitle ?? p.positionTitle ?? p.JobTitle ?? p.jobTitle}>
                    {p.PositionTitle ?? p.positionTitle ?? p.JobTitle ?? p.jobTitle ?? 'Poste sans titre'}
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium">
                      {departments.find(d => (d.departmentId ?? d.DepartmentId) === (p.DepartmentId || p.departmentId))?.name || departments.find(d => (d.departmentId ?? d.DepartmentId) === (p.DepartmentId || p.departmentId))?.Name || 'Sans département'}
                    </span>
                    <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium">{p.ContractType ?? 'CDI'}</span>
                  </div>

                  <div className="flex items-center gap-6 mt-auto pt-4 border-t border-border/50">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Candidats</p>
                      <p className="text-2xl font-bold">{candidatureCount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Publié le</p>
                      <p className="text-sm font-semibold">{new Date(p.DatePosted ?? new Date().toISOString()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {filteredPostes.length === 0 && !loading && (
        <div className="text-center py-24 bg-card border border-border rounded-2xl">
          <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-bold text-muted-foreground">Aucun poste trouvé</h3>
          <p className="text-muted-foreground">Essayez d'ajuster vos filtres de recherche</p>
        </div>
      )}

      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedPoste ? 'Modifier le poste' : 'Nouveau Poste'}</h2>
                  <p className="text-xs text-muted-foreground mt-1">Configurez les détails de l'offre</p>
                </div>
                <button onClick={() => setShowFormModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Titre du poste</label>
                  <input value={formData.PositionTitle} onChange={(e) => setFormData((f) => ({ ...f, PositionTitle: e.target.value }))} placeholder="Ex: Développeur React" className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea value={formData.Description} onChange={(e) => setFormData((f) => ({ ...f, Description: e.target.value }))} placeholder="Description générale..." className="w-full h-24 px-4 py-3 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Missions</label>
                  <textarea value={formData.Missions} onChange={(e) => setFormData((f) => ({ ...f, Missions: e.target.value }))} placeholder="Missions détaillées..." className="w-full h-24 px-4 py-3 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Pré-requis & Compétences</label>
                  <textarea value={formData.Skills} onChange={(e) => setFormData((f) => ({ ...f, Skills: e.target.value }))} placeholder="Compétences recherchées..." className="w-full h-24 px-4 py-3 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Expériences requises</label>
                  <textarea value={formData.Experience} onChange={(e) => setFormData((f) => ({ ...f, Experience: e.target.value }))} placeholder="Expérience attendue..." className="w-full h-24 px-4 py-3 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Département</label>
                  <select value={formData.DepartmentId || ''} onChange={(e) => setFormData((f) => ({ ...f, DepartmentId: e.target.value ? Number(e.target.value) : undefined }))} className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm">
                    <option value="">Sélectionner un département</option>
                    {departments.map((d) => (
                      <option key={d.departmentId ?? d.DepartmentId} value={d.departmentId ?? d.DepartmentId}>
                        {d.name ?? d.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contrat</label>
                  <select value={formData.ContractType} onChange={(e) => setFormData((f) => ({ ...f, ContractType: e.target.value }))} className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm">
                    {CONTRACT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Salaire</label>
                  <input value={formData.Salary} onChange={(e) => setFormData((f) => ({ ...f, Salary: e.target.value }))} placeholder="Salaire" className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Localisation</label>
                  <input value={formData.Location} onChange={(e) => setFormData((f) => ({ ...f, Location: e.target.value }))} placeholder="Ex: Paris, Télétravail..." className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date limite de candidature</label>
                  <input type="date" value={formData.ApplicationDeadline} onChange={(e) => setFormData((f) => ({ ...f, ApplicationDeadline: e.target.value }))} className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                </div>
              </div>

              <div className="p-6 bg-secondary/10 flex gap-3">
                <button onClick={() => setShowFormModal(false)} disabled={saving} className="flex-1 h-11 border border-border rounded-xl font-bold hover:bg-secondary/50 transition-all text-sm disabled:opacity-50">Annuler</button>
                <button onClick={() => { void savePoste(); }} disabled={saving} className="flex-1 h-11 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 text-sm disabled:opacity-70 flex items-center justify-center gap-2">
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{selectedPoste ? 'Enregistrement...' : 'Publication...'}</>
                  ) : (
                    selectedPoste ? 'Enregistrer' : 'Publier'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showViewModal && selectedPoste && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-4xl bg-card border border-border rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                    <Briefcase className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black">{selectedPoste.PositionTitle ?? selectedPoste.positionTitle ?? selectedPoste.JobTitle ?? selectedPoste.jobTitle}</h2>
                    <p className="text-muted-foreground">
                      {departments.find(d => (d.departmentId ?? d.DepartmentId) === (selectedPoste.DepartmentId || selectedPoste.departmentId))?.name || departments.find(d => (d.departmentId ?? d.DepartmentId) === (selectedPoste.DepartmentId || selectedPoste.departmentId))?.Name || 'Sans département'} • {selectedPoste.ContractType ?? 'CDI'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="p-3 hover:bg-secondary rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 max-h-[70vh] overflow-y-auto">
                <div className="lg:col-span-2 space-y-8">
                  <div>
                    <h3 className="text-xl font-black mb-4">Description du poste</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedPoste.Description || selectedPoste.description || 'Aucune description.'}</p>
                  </div>
                  {(selectedPoste.Missions || selectedPoste.missions) && (
                    <div>
                      <h3 className="text-xl font-black mb-4">Missions</h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedPoste.Missions || selectedPoste.missions}</p>
                    </div>
                  )}
                  {(selectedPoste.Skills || selectedPoste.skills) && (
                    <div>
                      <h3 className="text-xl font-black mb-4">Compétences</h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedPoste.Skills || selectedPoste.skills}</p>
                    </div>
                  )}
                  {(selectedPoste.Experience || selectedPoste.experience) && (
                    <div>
                      <h3 className="text-xl font-black mb-4">Expériences</h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedPoste.Experience || selectedPoste.experience}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-black mb-4">Pré-requis</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedPoste.Requirements || selectedPoste.requirements || 'Aucun pré-requis spécifié.'}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-secondary/20 rounded-[2rem] p-6 border border-border">
                    <h4 className="font-black mb-4 text-sm  tracking-widest">Informations clés</h4>
                    <div className="space-y-4">

                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground ">Localisation</p>
                          <p className="font-black text-sm">{selectedPoste.Location || selectedPoste.location || 'Non spécifiée'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground ">Salaire</p>
                          <p className="font-black text-sm">{selectedPoste.Salary || selectedPoste.salary || 'À négocier'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground ">Date de publication</p>
                          <p className="font-black text-sm">{(() => { const d = new Date(selectedPoste.DatePosted ?? selectedPoste.datePosted ?? ''); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR'); })()}</p>
                        </div>
                      </div>
                      {selectedPoste.ApplicationDeadline && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-error" />
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground ">Date limite</p>
                            <p className="font-black text-sm">{new Date(selectedPoste.ApplicationDeadline).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary text-white rounded-[2rem] p-6 shadow-xl shadow-primary/20">
                    <h4 className="font-black mb-2 text-sm  tracking-widest opacity-80">Statistiques</h4>
                    <p className="text-4xl font-black mb-1">{Array.isArray(selectedPoste.Applications) ? selectedPoste.Applications.length : 0}</p>
                    <p className="text-sm font-bold opacity-80">Candidatures reçues</p>
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
