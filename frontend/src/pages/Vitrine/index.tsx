import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Clock, Briefcase,
  ChevronRight, Building2, LayoutGrid, List
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSelector } from 'react-redux';
import { API_BASE_URL } from '../../config';
import type { RootState } from '../../redux/store';

interface JobPosting {
  jobPostingId: number;
  positionTitle: string;
  description: string;
  requirements: string;
  datePosted: string;
  applicationDeadline: string;
  contractType?: string;
  department?: string;
  salary?: string;
  status?: string;
  isActive?: boolean;
  IsActive?: boolean;
  etat?: boolean | number;
  Etat?: boolean | number;
}

export function Vitrine() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user = useSelector((s: RootState) => s.auth.user);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/JobPosting`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const activeJobs = data.filter(j => (j.isActive ?? j.IsActive ?? j.etat ?? j.Etat) !== false);
          setJobs(activeJobs);
        } else {
          setJobs([]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const departments = [
    'all',
    ...Array.from(new Set(jobs.map(j => j.department ?? '').filter(Boolean)))
  ];

  const filtered = jobs.filter(j => {
    const matchSearch = !search ||
      (j.positionTitle ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (j.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (j.department ?? '').toLowerCase().includes(search.toLowerCase());

    const matchDept =
      departmentFilter === 'all' || j.department === departmentFilter;

    return matchSearch && matchDept;
  });

  return (
    <div className="min-h-screen bg-background relative selection:bg-[#DC2626]/20 selection:text-[#DC2626]">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#DC2626] to-[#F87171] rounded-xl flex items-center justify-center shadow-lg shadow-[#DC2626]/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm tracking-tight">TC</span>
            </div>
            <span className="text-xl font-bold tracking-tight">TriCareer</span>
          </div>

          {isAuthenticated && user ? (
            <div
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 cursor-pointer hover:bg-secondary p-1.5 pr-4 rounded-full transition-all border border-border shadow-sm hover:shadow-md"
            >
              <div className="w-8 h-8 rounded-full bg-[#DC2626]/10 flex items-center justify-center text-[#DC2626] font-bold text-sm">
                {((user as any).Username || (user as any).username || (user as any).Email || 'U').charAt(0).toUpperCase()}
              </div>

              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-foreground leading-none mb-0.5">
                  {(user as any).Username || (user as any).username || 'Utilisateur'}
                </p>
                <p className="text-[10px] text-muted-foreground leading-none font-medium">
                  Tableau de bord
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="h-10 px-6 bg-[#DC2626] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#DC2626]/20 hover:bg-[#b91c1c] hover:shadow-[#DC2626]/40 hover:-translate-y-0.5 transition-all"
            >
              Connexion
            </button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative pt-32 pb-40 px-6 overflow-hidden flex flex-col items-center justify-center min-h-[70vh] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80')"
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/80 z-0" />

        {/* Red decorative background */}
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-[#1f1f1f]/40 via-[#f6f6f6]/20 to-transparent rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#DC2626]/20 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 w-full">


          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-7xl font-black mb-6 tracking-tight leading-[1.1] text-white"
          >
            Trouvez votre prochain <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F87171] to-white">
              grand défi.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-white/85 mb-12 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Découvrez des opportunités qui correspondent à vos ambitions et postulez en quelques minutes.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="  p-2 flex flex-col md:flex-row gap-2 max-w-2xl mx-auto shadow-2xl shadow-black/20"
          >
            <div className="flex-1 flex items-center gap-3 px-4 h-14 bg-white rounded-xl border border-white/50 focus-within:border-[#DC2626]/50 focus-within:ring-2 focus-within:ring-[#DC2626]/10 transition-all">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Titre du poste, compétence..."
                className="flex-1 h-full outline-none text-foreground bg-transparent text-base font-medium placeholder:font-normal"
              />
            </div>

            <div className="h-14 px-8 bg-[#DC2626] text-white rounded-xl font-bold text-base flex items-center justify-center shadow-lg shadow-[#DC2626]/20">
              {filtered.length} offre{filtered.length !== 1 ? 's' : ''}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters bar */}
      <div className="bg-card/50 backdrop-blur-md border-y border-border/50 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
            <span className="text-sm text-muted-foreground font-bold mr-2 whitespace-nowrap">
              Départements :
            </span>

            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`h-10 px-5 rounded-full text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${departmentFilter === dept
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-background border border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                  }`}
              >
                {dept === 'all' ? 'Tous les départements' : dept}
              </button>
            ))}
          </div>

          <div className="flex bg-secondary/50 p-1 rounded-xl border border-border/40 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Vue grille"
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#DC2626]' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Vue liste"
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#DC2626]' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Job listings */}
      <main className="max-w-7xl mx-auto px-6 py-20 min-h-[50vh]">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-[#DC2626] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-muted-foreground font-medium">
              Recherche d'opportunités...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 max-w-md mx-auto"
          >
            <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-10 h-10 text-muted-foreground" />
            </div>

            <h3 className="text-2xl font-bold mb-3">
              Aucune offre trouvée
            </h3>

            <p className="text-muted-foreground text-lg">
              {search
                ? "Nous n'avons pas d'offres correspondant exactement à votre recherche."
                : 'Revenez bientôt pour découvrir de nouvelles opportunités.'}
            </p>
          </motion.div>
        ) : viewMode === 'list' ? (
          <div className="flex flex-col gap-4">
            {filtered.map((job, index) => (
              <motion.div
                key={job.jobPostingId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.5) }}
                onClick={() => navigate(`/jobs/${job.jobPostingId}`)}
                className="bg-card border border-border/50 rounded-2xl p-5 hover:border-[#DC2626]/50 shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-background to-secondary rounded-xl flex items-center justify-center shadow-sm border border-border/50 group-hover:bg-[#DC2626]/5 transition-colors">
                  <Building2 className="w-6 h-6 text-[#DC2626]" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg group-hover:text-[#DC2626] transition-colors truncate">
                    {job.positionTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {job.department && (
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{job.department}</span>
                    )}
                    {(job.contractType ?? (job as any).ContractType) && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] font-semibold">
                        <Clock className="w-3 h-3" />
                        {job.contractType ?? (job as any).ContractType}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <span className="text-sm font-black text-[#DC2626] whitespace-nowrap">
                    {(job.salary ?? (job as any).Salary) || 'À négocier'}
                  </span>
                  {job.applicationDeadline && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      Limite: {new Date(job.applicationDeadline).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-[#DC2626] group-hover:text-white transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((job, index) => (
              <motion.div
                key={job.jobPostingId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.5) }}
                onClick={() => navigate(`/jobs/${job.jobPostingId}`)}
                className="bg-card border border-border/50 rounded-[2rem] p-8 hover:border-[#DC2626]/50 shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col h-full"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#DC2626]/5 to-transparent rounded-bl-full -z-10 group-hover:scale-125 transition-transform duration-500" />

                <div className="w-14 h-14 bg-gradient-to-br from-background to-secondary rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-border/50 group-hover:bg-[#DC2626]/5 transition-colors">
                  <Building2 className="w-7 h-7 text-[#DC2626]" />
                </div>

                <h3 className="font-bold text-xl mb-2 group-hover:text-[#DC2626] transition-colors line-clamp-2 leading-tight">
                  {job.positionTitle}
                </h3>

                {job.department && (
                  <p className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">
                    {job.department}
                  </p>
                )}

                <p className="text-base text-muted-foreground mb-6 line-clamp-3 flex-1 leading-relaxed">
                  {job.description ?? (job as any).Description}
                </p>

                <div className="flex flex-wrap gap-2 mb-8">
                  {(job.contractType ?? (job as any).ContractType) && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {job.contractType ?? (job as any).ContractType}
                    </span>
                  )}

                  {(job.requirements ?? (job as any).Requirements) && (
                    <span className="px-3 py-1.5 bg-[#DC2626]/10 text-[#DC2626] rounded-lg text-xs font-bold">
                      {job.requirements ?? (job as any).Requirements}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-border mt-auto">
                  {(job.salary ?? (job as any).Salary) ? (
                    <span className="text-sm font-black text-[#DC2626]">
                      {job.salary ?? (job as any).Salary}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      À négocier
                    </span>
                  )}

                  {job.applicationDeadline && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase tracking-tight">
                      <Clock className="w-3 h-3" />
                      Limite: {new Date(job.applicationDeadline).toLocaleDateString('fr-FR')}
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {job.datePosted
                        ? new Date(job.datePosted).toLocaleDateString('fr-FR')
                        : ''}
                    </span>

                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-[#DC2626] group-hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#DC2626] rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">
                TC
              </span>
            </div>

            <span className="text-lg font-bold">
              TriCareer
            </span>
          </div>

          <p className="text-sm text-muted-foreground font-medium">
            © 2026 TriCareer — Plateforme de recrutement propulsée par TriWeb
          </p>
        </div>
      </footer>
    </div>
  );
}
