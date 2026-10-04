import { useState } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { AIDecision } from '../../util/types';
import { motion } from 'motion/react';

// Dummy data removed as it is now fetched from the API
export function Decisions() {
  const [decisions] = useState<AIDecision[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<AIDecision | null>(null);

  const getRecommendationConfig = (recommendation: AIDecision['recommendation']) => {
    const configs = {
      hire: {
        label: 'Recommandé',
        color: 'success',
        icon: CheckCircle,
        bgClass: 'bg-success/10',
        textClass: 'text-success',
        borderClass: 'border-success',
      },
      review: {
        label: 'À revoir',
        color: 'warning',
        icon: AlertTriangle,
        bgClass: 'bg-warning/10',
        textClass: 'text-warning',
        borderClass: 'border-warning',
      },
      reject: {
        label: 'Non recommandé',
        color: 'error',
        icon: XCircle,
        bgClass: 'bg-error/10',
        textClass: 'text-error',
        borderClass: 'border-error',
      },
    };
    return configs[recommendation];
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Décisions IA</h1>
        <p className="text-muted-foreground">Recommandations intelligentes pour vos recrutements</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {decisions.map((decision, index) => {
            const config = getRecommendationConfig(decision.recommendation);
            const Icon = config.icon;

            return (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedDecision(decision)}
                className={`bg-card border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                  selectedDecision?.id === decision.id ? config.borderClass : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.bgClass}`}>
                      <Icon className={`w-6 h-6 ${config.textClass}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Candidat #{decision.candidateId}</h3>
                      <p className={`text-sm font-medium ${config.textClass}`}>{config.label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="font-bold text-lg">{decision.confidence}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Confiance IA</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Raisonnement principal :</p>
                    <ul className="space-y-1">
                      {decision.reasoning.slice(0, 2).map((reason, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {decision.comparison && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Classé {decision.comparison.rank}/{decision.comparison.totalCandidates} candidats
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          {selectedDecision ? (
            <motion.div
              key={selectedDecision.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-xl p-6 sticky top-24"
            >
              <h3 className="font-semibold mb-4">Analyse détaillée</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Niveau de confiance</span>
                    <span className="text-2xl font-bold">{selectedDecision.confidence}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-success transition-all"
                      style={{ width: `${selectedDecision.confidence}%` }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3">Tous les arguments :</p>
                  <ul className="space-y-2">
                    {selectedDecision.reasoning.map((reason, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedDecision.strengths.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Points forts
                    </p>
                    <ul className="space-y-2">
                      {selectedDecision.strengths.map((strength, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-success mt-1">✓</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDecision.concerns.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Points d'attention
                    </p>
                    <ul className="space-y-2">
                      {selectedDecision.concerns.map((concern, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-warning mt-1">!</span>
                          <span>{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDecision.comparison && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">Position dans le classement</p>
                    <div className="flex items-center justify-center gap-2 p-4 bg-primary/10 rounded-lg">
                      <span className="text-3xl font-bold text-primary">#{selectedDecision.comparison.rank}</span>
                      <span className="text-sm text-muted-foreground">/ {selectedDecision.comparison.totalCandidates}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-border">
                  <button className="w-full h-10 bg-success text-success-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
                    Valider la décision
                  </button>
                  <button className="w-full h-10 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
                    Demander un avis
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 text-center sticky top-24">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Sélectionnez une décision pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

