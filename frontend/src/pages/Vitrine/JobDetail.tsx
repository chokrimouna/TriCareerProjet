import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Briefcase,
  Upload, CheckCircle, XCircle, Loader2, Building2
} from 'lucide-react';
import { motion } from 'motion/react';
import { API_BASE_URL } from '../../config';

interface JobPosting {
  jobPostingId: number;
  positionTitle: string;
  description: string;
  requirements: string;
  applicationDeadline: string;
  datePosted: string;
  contractType?: string;
  department?: string;
  salary?: string;
  status?: string;
  missions?: string;
  skills?: string;
  experience?: string;
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    motivation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE_URL}/api/JobPosting/${id}`)
      .then(r => r.json())
      .then(data => { setJob(data); setLoading(false); })
      .catch(() => {
        fetch(`${API_BASE_URL}/api/JobPosting`)
          .then(r => r.json())
          .then((jobs: JobPosting[]) => {
            setJob(jobs.find(j => String(j.jobPostingId) === id) ?? null);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCvError('');
    if (!file) return;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) {
      setCvError('Formats acceptés : PDF, DOC, DOCX');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCvError('Le fichier ne doit pas dépasser 10MB');
      return;
    }
    setCvFile(file);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Le prénom est requis';
    if (!form.lastName.trim()) e.lastName = 'Le nom est requis';
    if (!form.email.trim()) e.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Email invalide';
    if (!cvFile) e.cv = 'Le CV est requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !job) return;
    setSubmitStatus('loading');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('firstName', form.firstName);
    formData.append('lastName', form.lastName);
    formData.append('email', form.email);
    if (form.phone) formData.append('phone', form.phone);
    if (form.motivation) formData.append('motivation', form.motivation);
    formData.append('jobPostingId', String(job.jobPostingId));
    formData.append('cv', cvFile!);

    try {
      const res = await fetch(`${API_BASE_URL}/api/Application/apply`, {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type — browser handles multipart boundary
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data?.message ?? 'Une erreur est survenue');
        setSubmitStatus('error');
        return;
      }
      setSubmitStatus('success');
    } catch {
      setErrorMessage('Impossible de joindre le serveur. Réessayez plus tard.');
      setSubmitStatus('error');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#DC2626] border-t-transparent
        rounded-full animate-spin" />
    </div>
  );

  if (!job) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Offre introuvable</h2>
        <button onClick={() => navigate('/jobs')}
          className="h-11 px-6 bg-[#DC2626] text-white rounded-lg font-medium">
          Retour aux offres
        </button>
      </div>
    </div>
  );

  // Success screen
  if (submitStatus === 'success') return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-3xl p-12
          max-w-lg w-full text-center"
      >
        <div className="w-20 h-20 bg-[#16A34A]/10 rounded-full flex items-center
          justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-[#16A34A]" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Candidature envoyée !</h2>
        <p className="text-muted-foreground mb-8">
          Merci <strong>{form.firstName} {form.lastName}</strong>. Votre candidature pour le poste
          de <strong>{job.positionTitle ?? (job as any).PositionTitle}</strong> a bien été reçue.<br /><br />
          Notre équipe RH examinera votre dossier et vous contactera
          à <strong>{form.email}</strong> prochainement.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/jobs')}
            className="w-full h-12 bg-[#DC2626] text-white rounded-2xl
              font-semibold hover:shadow-xl transition-all"
          >
            Voir d'autres offres
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full h-12 bg-secondary text-foreground rounded-xl
              font-medium hover:bg-secondary/80 transition-colors"
          >
            Se connecter à la plateforme
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/jobs')}
            className="flex items-center gap-2 text-sm text-muted-foreground
              hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux offres
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#DC2626] rounded-md flex items-center
              justify-center">
              <span className="text-white font-bold text-xs">TC</span>
            </div>
            <span className="font-bold text-sm">TriCareer</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Job info */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#DC2626]/20
                  to-[#F87171]/20 rounded-xl flex items-center justify-center
                  flex-shrink-0">
                  <Building2 className="w-8 h-8 text-[#DC2626]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold mb-1">{job.positionTitle ?? (job as any).PositionTitle}</h1>
                  {(job.department ?? (job as any).Department) && (
                    <p className="text-muted-foreground">{job.department ?? (job as any).Department}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                {(job.contractType ?? (job as any).ContractType) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-[#DC2626]" /> {job.contractType ?? (job as any).ContractType}
                  </div>
                )}
                {(job.requirements ?? (job as any).Requirements) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="w-4 h-4 text-[#DC2626]" /> {job.requirements ?? (job as any).Requirements}
                  </div>
                )}
                {(job.salary ?? (job as any).Salary) && (
                  <span className="px-3 py-1 bg-[#DC2626]/10 text-[#DC2626]
                    rounded-full text-sm font-semibold">
                    {job.salary ?? (job as any).Salary}
                  </span>
                )}
                {(job.applicationDeadline ?? (job as any).ApplicationDeadline) && (
                  <div className="flex items-center gap-2 text-sm text-[#DC2626] font-bold">
                    <Clock className="w-4 h-4" /> Date limite: {new Date(job.applicationDeadline ?? (job as any).ApplicationDeadline).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>

              {(job.description ?? (job as any).Description) && (
                <div className="pt-6 border-t border-border">
                  <h2 className="text-lg font-semibold mb-3">
                    Description du poste
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {job.description ?? (job as any).Description}
                  </p>
                </div>
              )}
              
              {(job.missions ?? (job as any).Missions) && (
                <div className="pt-6 border-t border-border">
                  <h2 className="text-lg font-semibold mb-3">
                    Missions
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {job.missions ?? (job as any).Missions}
                  </p>
                </div>
              )}

              {(job.skills ?? (job as any).Skills) && (
                <div className="pt-6 border-t border-border">
                  <h2 className="text-lg font-semibold mb-3">
                    Compétences
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {job.skills ?? (job as any).Skills}
                  </p>
                </div>
              )}

              {(job.experience ?? (job as any).Experience) && (
                <div className="pt-6 border-t border-border">
                  <h2 className="text-lg font-semibold mb-3">
                    Expériences
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {job.experience ?? (job as any).Experience}
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Application form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift sticky top-24"
            >
              <h2 className="text-xl font-bold mb-6">Postuler</h2>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Name & Prename */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Prénom <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Jean"
                      className={`w-full h-11 px-4 bg-input-background border
                        rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626]
                        text-sm ${errors.firstName ? 'border-[#DC2626]' : 'border-input'}`}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-[#DC2626] mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Nom <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Dupont"
                      className={`w-full h-11 px-4 bg-input-background border
                        rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626]
                        text-sm ${errors.lastName ? 'border-[#DC2626]' : 'border-input'}`}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-[#DC2626] mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Email <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="jean.dupont@email.com"
                    className={`w-full h-11 px-4 bg-input-background border
                      rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626]
                      text-sm ${errors.email ? 'border-[#DC2626]' : 'border-input'}`}
                  />
                  {errors.email && (
                    <p className="text-xs text-[#DC2626] mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+216 00 000 000"
                    className="w-full h-11 px-4 bg-input-background border
                      border-input rounded-lg outline-none focus:ring-2
                      focus:ring-[#DC2626] text-sm"
                  />
                </div>

                {/* Motivation */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Lettre de motivation
                  </label>
                  <textarea
                    value={form.motivation}
                    onChange={e => setForm({ ...form, motivation: e.target.value })}
                    placeholder="Décrivez vos motivations et expériences pertinentes..."
                    rows={4}
                    className="w-full px-4 py-3 bg-input-background border
                      border-input rounded-lg outline-none focus:ring-2
                      focus:ring-[#DC2626] resize-none text-sm"
                  />
                </div>

                {/* CV Upload */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    CV <span className="text-[#DC2626]">*</span>
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center
                      cursor-pointer transition-all
                      ${errors.cv
                        ? 'border-[#DC2626] bg-[#DC2626]/5'
                        : cvFile
                          ? 'border-[#16A34A] bg-[#16A34A]/5'
                          : 'border-border hover:border-[#DC2626]/50 hover:bg-secondary/30'
                      }`}
                  >
                    {cvFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                        <span className="text-sm font-medium text-[#16A34A]
                          truncate max-w-[200px]">
                          {cvFile.name}
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-7 h-7 text-muted-foreground
                          mx-auto mb-2" />
                        <p className="text-sm font-medium">
                          Cliquez pour choisir votre CV
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC ou DOCX — max 10MB
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  {(errors.cv || cvError) && (
                    <p className="text-xs text-[#DC2626] mt-1">
                      {errors.cv || cvError}
                    </p>
                  )}
                </div>

                {/* API error */}
                {submitStatus === 'error' && (
                  <div className="p-3 bg-[#DC2626]/10 border border-[#DC2626]/20
                    rounded-lg flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#DC2626]">
                      {errorMessage || 'Une erreur est survenue. Réessayez.'}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitStatus === 'loading'}
                  className="w-full h-12 bg-gradient-to-r from-[#DC2626] to-[#F87171]
                    text-white rounded-2xl font-semibold hover:shadow-xl
                    hover:scale-105 transition-all disabled:opacity-50
                    disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {submitStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer ma candidature'
                  )}
                </button>

                <p className="text-xs text-center text-muted-foreground">
                  En soumettant ce formulaire, vous acceptez que vos données
                  soient traitées dans le cadre de votre candidature.
                </p>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
