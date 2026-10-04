import { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  GripVertical, 
  CheckCircle2, 
  Settings2,
  Save,
  Brain,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';

interface ChecklistItem {
  checklistId?: number;
  criterion: string;
  order: number;
  score: number;
}

export function TestChecklistManagement() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchChecklist = async () => {
    try {
      const res = await api.get<ChecklistItem[]>('/api/TestChecklist');
      // If none, provide defaults
      if (res.length === 0) {
        setItems([
          { criterion: 'Qualité du code (Clean Code)', order: 1, score: 10 },
          { criterion: 'Performance & Optimisation', order: 2, score: 10 },
          { criterion: 'Architecture & Patterns', order: 3, score: 10 },
          { criterion: 'Tests Unitaires', order: 4, score: 10 },
        ]);
      } else {
        setItems(res.sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
    } catch (e) {
      console.error('Error fetching checklist:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, []);

  const handleAddItem = () => {
    const newItem: ChecklistItem = {
      criterion: '',
      order: items.length + 1,
      score: 10
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
  };

  const handleUpdateItem = (index: number, field: keyof ChecklistItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Logic to save all items (POST or batch PUT)
      // Since backend might not have batch, we loop or assume a batch endpoint exists
      await api.post('/api/TestChecklist/BatchUpdate', items);
      toast.success('Checklist mise à jour avec succès');
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-[#DC2626]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Critères d'Évaluation</h1>
            <p className="text-muted-foreground">Définissez la grille d'évaluation technique standard.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleAddItem}
            className="h-12 px-6 border border-border rounded-xl font-semibold hover:bg-secondary transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter un critère
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-12 px-8 bg-[#DC2626] text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Enregistrer la grille
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
        <Brain className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div className="text-sm text-blue-800 leading-relaxed">
          <p className="font-bold mb-1">Intelligence Artificielle TriCareer</p>
          Ces critères sont utilisés par l'IA pour générer l'analyse comparative des candidats. Une grille précise permet une meilleure aide à la décision.
        </div>
      </div>

      <div className="bg-card border border-border rounded-[2.5rem] shadow-card overflow-hidden">
        <div className="p-8 space-y-4">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-6 p-4 bg-secondary/20 rounded-2xl border border-transparent hover:border-[#DC2626]/30 transition-all group"
            >
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-5 h-5" />
              </div>
              
              <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center font-bold text-sm shadow-sm">
                {index + 1}
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  value={item.criterion}
                  onChange={(e) => handleUpdateItem(index, 'criterion', e.target.value)}
                  placeholder="Nom du critère (ex: Clean Code, Algorithmique...)"
                  className="w-full bg-transparent border-none outline-none text-lg font-medium placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-border shadow-sm">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase">Poids:</span>
                <input
                  type="number"
                  value={item.score}
                  onChange={(e) => handleUpdateItem(index, 'score', parseInt(e.target.value))}
                  className="w-12 bg-transparent border-none outline-none font-bold text-center"
                />
                <span className="text-xs text-muted-foreground">pts</span>
              </div>

              <button
                onClick={() => handleRemoveItem(index)}
                className="p-3 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </motion.div>
          ))}

          {items.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Aucun critère défini pour le moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
