import { useState } from 'react';
import { Sparkles, Copy, Download, Save, RefreshCw } from 'lucide-react';
import { InterviewQuestion } from '../../util/types';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const mockQuestions: InterviewQuestion[] = [
  {
    id: '1',
    question:
      'Expliquez comment fonctionne le Virtual DOM dans React et pourquoi est-il important pour les performances ?',
    category: 'technical',
    difficulty: 'medium',
    expectedAnswer: 'Le Virtual DOM est une représentation légère du DOM réel...',
  },
  {
    id: '2',
    question: 'Décrivez une situation où vous avez dû résoudre un conflit au sein de votre équipe.',
    category: 'behavioral',
    difficulty: 'medium',
  },
  {
    id: '3',
    question:
      "Comment optimiseriez-vous les performances d'une application React avec un grand nombre de composants ?",
    category: 'technical',
    difficulty: 'hard',
  },
  {
    id: '4',
    question: "Parlez-moi d'un projet dont vous êtes particulièrement fier et de votre contribution.",
    category: 'behavioral',
    difficulty: 'easy',
  },
  {
    id: '5',
    question:
      "Si vous deviez concevoir une architecture microservices pour notre plateforme, quelle approche adopteriez-vous ?",
    category: 'situational',
    difficulty: 'hard',
  },
];

export function Interviews() {
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setQuestions(mockQuestions);
    setIsGenerating(false);
    toast.success('Questions générées avec succès !');
  };

  const getCategoryLabel = (category: InterviewQuestion['category']) => {
    const labels = {
      technical: 'Technique',
      behavioral: 'Comportemental',
      situational: 'Situationnel',
    };
    return labels[category];
  };

  const getCategoryColor = (category: InterviewQuestion['category']) => {
    const colors = {
      technical: 'bg-primary/10 text-primary',
      behavioral: 'bg-info/10 text-info',
      situational: 'bg-warning/10 text-warning',
    };
    return colors[category];
  };

  const getDifficultyLabel = (difficulty: InterviewQuestion['difficulty']) => {
    const labels = {
      easy: 'Facile',
      medium: 'Moyen',
      hard: 'Difficile',
    };
    return labels[difficulty];
  };

  const getDifficultyColor = (difficulty: InterviewQuestion['difficulty']) => {
    const colors = {
      easy: 'bg-success/10 text-success',
      medium: 'bg-warning/10 text-warning',
      hard: 'bg-error/10 text-error',
    };
    return colors[difficulty];
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesCategory = selectedCategory === 'all' || q.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    return matchesCategory && matchesDifficulty;
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Génération de Questions d'Entretien</h1>
        <p className="text-muted-foreground">Créez des questions personnalisées avec l'IA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Paramètres de génération</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Description du poste</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Ex: Développeur Full Stack Senior avec expertise en React et Node.js..."
                  className="w-full h-32 px-4 py-3 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nombre de questions</label>
                <select className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring">
                  <option>5 questions</option>
                  <option>10 questions</option>
                  <option>15 questions</option>
                  <option>20 questions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Types de questions</label>
                <div className="space-y-2">
                  {[
                    { value: 'technical', label: 'Questions techniques' },
                    { value: 'behavioral', label: 'Questions comportementales' },
                    { value: 'situational', label: 'Questions situationnelles' },
                  ].map((type) => (
                    <label key={type.value} className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-input" />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !jobDescription}
                className="w-full h-11 bg-gradient-to-r from-primary to-brand-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Générer avec l'IA
                  </>
                )}
              </button>
            </div>
          </div>

          {questions.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => toast.success('Questions copiées')}
                  className="w-full h-10 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copier tout
                </button>
                <button
                  onClick={() => toast.success('Questions exportées')}
                  className="w-full h-10 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exporter PDF
                </button>
                <button
                  onClick={() => toast.success('Modèle sauvegardé')}
                  className="w-full h-10 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Sauvegarder modèle
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {questions.length > 0 ? (
            <>
              <div className="flex gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-10 px-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">Toutes les catégories</option>
                  <option value="technical">Technique</option>
                  <option value="behavioral">Comportemental</option>
                  <option value="situational">Situationnel</option>
                </select>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="h-10 px-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">Toutes les difficultés</option>
                  <option value="easy">Facile</option>
                  <option value="medium">Moyen</option>
                  <option value="hard">Difficile</option>
                </select>
              </div>

              <div className="space-y-4">
                {filteredQuestions.map((q, index) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card border border-border rounded-xl p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-medium text-muted-foreground">Question {index + 1}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(q.category)}`}>
                            {getCategoryLabel(q.category)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(q.difficulty)}`}
                          >
                            {getDifficultyLabel(q.difficulty)}
                          </span>
                        </div>
                        <p className="text-lg">{q.question}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(q.question);
                          toast.success('Question copiée');
                        }}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors ml-4"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {q.expectedAnswer && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Réponse attendue :</p>
                        <p className="text-sm text-muted-foreground">{q.expectedAnswer}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucune question générée</h3>
              <p className="text-muted-foreground">Remplissez la description du poste et cliquez sur "Générer avec l'IA"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

