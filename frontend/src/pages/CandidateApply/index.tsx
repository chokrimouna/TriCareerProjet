import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config';

type Poste = {
  JobPostingId: number;
  PositionTitle?: string;
};

export default function CandidateApply() {
  const { jobId } = useParams();
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [selectedPoste, setSelectedPoste] = useState(jobId ?? '');
  const [skills, setSkills] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/JobPosting`);
        const data = await res.json();
        setPostes(Array.isArray(data) ? data : []);
      } catch {
        setPostes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedTitle = useMemo(
    () => postes.find((p) => String(p.JobPostingId) === String(selectedPoste))?.PositionTitle,
    [postes, selectedPoste],
  );

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setTelephone('');
    setSkills('');
    setCvFile(null);
    setLetterFile(null);
    setMessage('');
    setError('');
    setSuccess('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!cvFile) {
      setError('CV requis');
      return;
    }
    if (cvFile.type !== 'application/pdf' || (letterFile && letterFile.type !== 'application/pdf')) {
      setError('Seuls les fichiers PDF sont acceptés');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('firstName', firstName.trim());
      form.append('lastName', lastName.trim());
      form.append('email', email.trim());
      form.append('phone', telephone.trim() || "0600000000");
      form.append('jobPostingId', Number(selectedPoste).toString());
      form.append('motivation', (message || skills || "Candidature via plateforme").trim());
      form.append('cv', cvFile);
      
      console.log('Données envoyées :', {
        firstName, lastName, email, telephone, selectedPoste
      });

      const res = await fetch(`${API_BASE_URL}/api/Application/apply`, {
        method: 'POST',
        body: form,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Erreur envoi candidature');
      }
      
      setSuccess('Votre candidature a été envoyée avec succès! Consultez vos emails pour vos identifiants.');
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Erreur envoi candidature');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-8 space-y-6">
        <h1 className="text-3xl font-bold">Formulaire de candidature</h1>
        {selectedTitle ? <p className="text-muted-foreground">Poste: {selectedTitle}</p> : null}

        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-semibold">Informations personnelles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring" />
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring" />
            <input required type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Téléphone" className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring" />
            <select required value={selectedPoste} onChange={(e) => setSelectedPoste(e.target.value)} className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring">
              <option value="">Sélectionner un poste</option>
              {postes.map((p) => <option key={p.JobPostingId} value={p.JobPostingId}>{p.PositionTitle}</option>)}
            </select>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Compétences (comma separated)" className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Documents</h2>
            <input required type="file" accept="application/pdf" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} className="w-full h-11 px-3 bg-input-background border border-input rounded-lg" />
            <input type="file" accept="application/pdf" onChange={(e) => setLetterFile(e.target.files?.[0] ?? null)} className="w-full h-11 px-3 bg-input-background border border-input rounded-lg" />
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Compléments</h2>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message / Motivation" className="w-full h-28 px-4 py-3 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          {success ? <p className="text-success text-sm">{success}</p> : null}
          {error ? <p className="text-error text-sm">{error}</p> : null}

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="h-11 px-5 bg-primary text-primary-foreground rounded-lg">
              {submitting ? 'Envoi...' : 'Postuler'}
            </button>
            <button type="button" onClick={resetForm} className="h-11 px-5 bg-secondary rounded-lg">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
