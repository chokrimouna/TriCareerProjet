import { X, Download, Star, FileText, Mail, Phone, Briefcase, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface CVViewerProps {
  candidateName: string;
  candidateEmail?: string;
  position?: string;
  experience?: string;
  skills?: string[];
  summary?: string;
  matchingScore?: number;
  onClose: () => void;
}

export function CVViewer({
  candidateName,
  candidateEmail,
  position,
  experience,
  skills,
  summary,
  matchingScore,
  onClose,
}: CVViewerProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-[#DC2626]/5 to-[#F87171]/5">
          <div>
            <h2 className="text-2xl font-bold mb-1">{candidateName}</h2>
            {position && <p className="text-muted-foreground">{position}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 bg-secondary hover:bg-secondary/80 rounded-lg flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {summary && (
                <div className="bg-gradient-to-br from-[#DC2626]/10 to-[#F87171]/10 border border-[#DC2626]/20 rounded-2xl p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#DC2626]" />
                    Résumé
                  </h3>
                  <p className="text-sm leading-relaxed">{summary}</p>
                </div>
              )}

              {skills && skills.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-semibold mb-4">Compétences</h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gradient-to-br from-[#DC2626]/10 to-[#F87171]/10 text-[#DC2626] rounded-lg text-sm font-medium border border-[#DC2626]/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-semibold mb-4">Informations de contact</h3>
                <div className="space-y-3">
                  {candidateEmail && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#DC2626]/10 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-[#DC2626]" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{candidateEmail}</p>
                      </div>
                    </div>
                  )}
                  {experience && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#DC2626]/10 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-[#DC2626]" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Expérience</p>
                        <p className="font-medium">{experience}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {matchingScore !== undefined && (
                <div className="bg-gradient-to-br from-[#DC2626] to-[#F87171] rounded-2xl p-6 text-white">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Score d'adéquation
                  </h3>
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">{matchingScore}%</div>
                    <p className="text-sm opacity-90">
                      {matchingScore >= 90 ? 'Excellent match' : matchingScore >= 70 ? 'Bon match' : 'Match moyen'}
                    </p>
                  </div>
                </div>
              )}

              <button className="w-full h-12 bg-[#DC2626] text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Télécharger le CV
              </button>

              <div className="bg-card border border-border rounded-2xl p-4">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Actions rapides</h4>
                <div className="space-y-2">
                  <button className="w-full h-10 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                    Planifier entretien
                  </button>
                  <button className="w-full h-10 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                    Envoyer un message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
