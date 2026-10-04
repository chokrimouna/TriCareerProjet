import { useMemo, useState } from 'react';
import { Upload, Search, Filter, Eye, Download, Trash2, Star } from 'lucide-react';
import { CV } from '../../util/types';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useApplications } from '../../hooks/useApplications';

export function CVs() {
  const { data: applications } = useApplications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const cvs = useMemo<CV[]>(() => {
    return (applications || []).map((app: any) => {
      const candidateName =
        app?.candidateName ||
        app?.CandidateName ||
        app?.fullName ||
        app?.FullName ||
        app?.name ||
        app?.Name ||
        app?.email ||
        app?.Email ||
        'Candidat';

      const candidateEmail = app?.email || app?.Email || '';

      return {
        id: String(app?.id ?? app?.applicationId ?? app?.ApplicationId ?? app?.Id ?? ''),
        candidateName: String(candidateName),
        candidateEmail: String(candidateEmail),
        fileName: String(app?.fileName ?? app?.FileName ?? ''),
        uploadDate: String(app?.uploadDate ?? app?.UploadDate ?? app?.createdAt ?? app?.CreatedAt ?? ''),
        status: 'pending',
        aiScore: Number(app?.aiScore ?? app?.AiScore ?? 0),
        skills: Array.isArray(app?.skills) ? app.skills : [],
        experience: String(app?.experience ?? ''),
        summary: String(app?.summary ?? ''),
        matchingScore: Number(app?.matchingScore ?? app?.MatchingScore ?? 0),
      } satisfies CV;
    });
  }, [applications]);

  const getStatusColor = (status: CV['status']) => {
    const colors = {
      pending: 'bg-warning/10 text-warning',
      reviewed: 'bg-info/10 text-info',
      shortlisted: 'bg-success/10 text-success',
      rejected: 'bg-error/10 text-error',
    };
    return colors[status];
  };

  const getStatusLabel = (status: CV['status']) => {
    const labels = {
      pending: 'En attente',
      reviewed: 'Examiné',
      shortlisted: 'Présélectionné',
      rejected: 'Rejeté',
    };
    return labels[status];
  };

  const filteredCVs = cvs.filter((cv) => {
    const matchesSearch =
      cv.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cv.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || cv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des CV</h1>
          <p className="text-muted-foreground">Analysez et gérez vos candidatures</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Importer CV
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-11 px-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="reviewed">Examiné</option>
            <option value="shortlisted">Présélectionné</option>
            <option value="rejected">Rejeté</option>
          </select>
          <button className="h-11 px-4 bg-card border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {filteredCVs.map((cv, index) => (
            <motion.div
              key={cv.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => setSelectedCV(cv)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{cv.candidateName}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{cv.candidateEmail}</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cv.status)}`}>
                      {getStatusLabel(cv.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">{cv.experience}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span className="font-bold text-lg">{cv.aiScore}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Score IA</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{cv.summary}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {cv.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">Téléchargé le {cv.uploadDate}</span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success('CV téléchargé');
                    }}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success('CV supprimé');
                    }}
                    className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="lg:col-span-1">
          {selectedCV ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-xl p-6 sticky top-24"
            >
              <h3 className="font-semibold mb-4">Détails du CV</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Candidat</label>
                  <p className="font-medium">{selectedCV.candidateName}</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium text-sm">{selectedCV.candidateEmail}</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Score d'adéquation</label>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl font-bold">{selectedCV.matchingScore}%</span>
                      <span className="text-sm text-success">Excellent</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-success transition-all"
                        style={{ width: `${selectedCV.matchingScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Compétences clés</label>
                  <div className="mt-2 space-y-2">
                    {selectedCV.skills.map((skill) => (
                      <div key={skill} className="flex items-center justify-between">
                        <span className="text-sm">{skill}</span>
                        <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '85%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <button className="w-full h-10 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
                    Voir le CV complet
                  </button>
                  <button className="w-full h-10 bg-success text-success-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
                    Présélectionner
                  </button>
                  <button className="w-full h-10 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
                    Générer questions
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Sélectionnez un CV pour voir les détails</p>
            </div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl p-6 max-w-md w-full border border-border"
          >
            <h3 className="text-xl font-semibold mb-4">Importer des CV</h3>
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium mb-1">Glissez vos fichiers ici</p>
              <p className="text-sm text-muted-foreground">ou cliquez pour parcourir</p>
              <p className="text-xs text-muted-foreground mt-2">PDF, DOC, DOCX jusqu'à 10MB</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 h-11 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.success('CV importé avec succès');
                  setShowUploadModal(false);
                }}
                className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Importer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

