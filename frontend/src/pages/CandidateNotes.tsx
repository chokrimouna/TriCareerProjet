import { useState } from 'react';
import { Plus, Search, Star } from 'lucide-react';
import { ManagerNote } from '../util/types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const emojiOptions = [
  { emoji: '🌟', label: 'Excellent', value: 5 },
  { emoji: '😊', label: 'Très bien', value: 4 },
  { emoji: '👍', label: 'Bien', value: 3 },
  { emoji: '😐', label: 'Moyen', value: 2 },
  { emoji: '👎', label: 'Insuffisant', value: 1 },
];

const categoryOptions = [
  { value: 'technical', label: 'Compétences techniques' },
  { value: 'soft_skills', label: 'Soft skills' },
  { value: 'cultural_fit', label: 'Adéquation culturelle' },
  { value: 'general', label: 'Général' },
];

// Dummy data removed as it is now fetched from the API
export function CandidateNotes() {
  const [notes, setNotes] = useState<ManagerNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNote, setNewNote] = useState<Partial<ManagerNote>>({
    candidateId: '1',
    emoji: '🌟',
    rating: 5,
    category: 'general',
    content: '',
  });

  const getCategoryLabel = (category: string) => {
    return categoryOptions.find(c => c.value === category)?.label || category;
  };

  const handleAddNote = () => {
    if (!newNote.content?.trim()) {
      toast.error('Veuillez saisir un commentaire');
      return;
    }

    const note: ManagerNote = {
      id: `${notes.length + 1}`,
      candidateId: newNote.candidateId!,
      managerId: '2',
      managerName: 'Marie Dubois',
      content: newNote.content!,
      emoji: newNote.emoji!,
      rating: newNote.rating!,
      createdAt: new Date().toLocaleString('fr-FR'),
      category: newNote.category as any,
    };

    setNotes([note, ...notes]);
    setShowAddModal(false);
    setNewNote({
      candidateId: '1',
      emoji: '🌟',
      rating: 5,
      category: 'general',
      content: '',
    });
    toast.success('Note ajoutée avec succès');
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    toast.success('Note supprimée');
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          note.managerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || note.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notes des Managers & RH</h1>
          <p className="text-muted-foreground">Évaluations et commentaires sur les candidats</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter une note
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher dans les notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-11 px-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Toutes les catégories</option>
          {categoryOptions.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filteredNotes.map((note, index) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="text-5xl">{note.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{note.managerName}</h3>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: note.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                      ))}
                    </div>
                  </div>
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-3">
                    {getCategoryLabel(note.category)}
                  </span>
                  <p className="text-muted-foreground">{note.content}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteNote(note.id)}
                className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">{note.createdAt}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-xl p-6 max-w-lg w-full border border-border"
            >
              <h3 className="text-xl font-semibold mb-4">Ajouter une note</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3">Évaluation</label>
                  <div className="flex gap-3 justify-center">
                    {emojiOptions.map((option) => (
                      <button
                        key={option.emoji}
                        onClick={() => setNewNote({ ...newNote, emoji: option.emoji, rating: option.value })}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          newNote.emoji === option.emoji
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="text-3xl">{option.emoji}</span>
                        <span className="text-xs font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie</label>
                  <select
                    value={newNote.category}
                    onChange={(e) => setNewNote({ ...newNote, category: e.target.value as any })}
                    className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                  >
                    {categoryOptions.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Commentaire</label>
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    placeholder="Votre évaluation détaillée du candidat..."
                    className="w-full h-32 px-4 py-3 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-11 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddNote}
                  className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Ajouter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
