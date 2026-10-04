import { useEffect, useMemo, useState } from 'react';
import { Copy, Plus, Trash2, Save, ExternalLink, Layout, Settings, Share2, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../helpers/apiClient';

type FieldType = 'Text' | 'Textarea' | 'Select' | 'File' | 'Date' | 'Checkbox';

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for Select
}

type Poste = {
  JobPostingId: number;
  PositionTitle?: string;
};

export default function AdminFormulaire() {
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any[]>('/api/JobPosting');
        setPostes(Array.isArray(res) ? res : []);
      } catch {
        setPostes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addField = () => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      type: 'Text',
      required: false,
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleSave = async () => {
    if (!formName) {
      toast.error('Veuillez donner un nom au formulaire');
      return;
    }
    if (fields.length === 0) {
      toast.error('Veuillez ajouter au moins un champ');
      return;
    }
    if (!selectedJobId) {
      toast.error('Veuillez sélectionner un poste');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName,
        jobPostingId: selectedJobId,
        fields: JSON.stringify(fields)
      };
      try {
        await api.post(`/api/JobPosting/${selectedJobId}/form`, payload);
      } catch {
        await api.post('/api/Form', payload);
      }
      toast.success('Formulaire enregistré avec succès');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const shareLink = useMemo(() => {
    if (!selectedJobId) return '';
    const base = window.location.origin;
    return `${base}/apply/${selectedJobId}`;
  }, [selectedJobId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Configurateur de Formulaire</h1>
          <p className="text-muted-foreground mt-1 text-sm">Créez des formulaires de candidature personnalisés pour vos postes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-12 px-6 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card border border-border rounded-[2rem] p-8 shadow-card hover-lift">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Layout className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Structure du formulaire</h2>
              </div>
              <button
                onClick={addField}
                className="h-10 px-4 bg-secondary hover:bg-secondary/80 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter un champ
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black  tracking-widest text-muted-foreground ml-1">Nom du formulaire</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Candidature Développeur Fullstack"
                  className="w-full h-12 px-4 bg-secondary/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {fields.map((field, idx) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-6 border border-border rounded-2xl bg-secondary/10 space-y-4 group relative"
                    >
                      <button
                        onClick={() => removeField(field.id)}
                        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black  tracking-widest text-muted-foreground ml-1">Libellé du champ</label>
                          <input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="Ex: Pourquoi voulez-vous nous rejoindre ?"
                            className="w-full h-11 px-4 bg-card border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black  tracking-widest text-muted-foreground ml-1">Type de donnée</label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                            className="w-full h-11 px-4 bg-card border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                          >
                            <option value="Text">Texte court</option>
                            <option value="Textarea">Texte long</option>
                            <option value="Select">Liste déroulante</option>
                            <option value="File">Téléchargement (CV/Doc)</option>
                            <option value="Date">Date</option>
                            <option value="Checkbox">Case à cocher</option>
                          </select>
                        </div>
                      </div>

                      {field.type === 'Select' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          <label className="text-[10px] font-black  tracking-widest text-muted-foreground ml-1">Options (séparées par des virgules)</label>
                          <input
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            placeholder="Junior, Senior, Expert"
                            className="w-full h-11 px-4 bg-card border border-border rounded-xl text-sm font-medium"
                          />
                        </motion.div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateField(field.id, { required: !field.required })}
                          className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${field.required ? 'bg-primary border-primary text-white' : 'border-border bg-card'}`}
                        >
                          {field.required && <Plus className="w-3 h-3 rotate-45" />}
                        </button>
                        <span className="text-xs font-bold text-muted-foreground">Rendre ce champ obligatoire</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {fields.length === 0 && (
                  <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl bg-secondary/5">
                    <MousePointer2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground font-medium">Aucun champ défini</p>
                    <button onClick={addField} className="mt-4 text-primary font-bold text-sm hover:underline">Cliquez ici pour commencer</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift space-y-6 sticky top-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="font-bold">Paramètres de diffusion</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black  tracking-widest text-muted-foreground ml-1">Poste associé</label>
                <select
                  value={selectedJobId || ''}
                  onChange={(e) => setSelectedJobId(Number(e.target.value))}
                  className="w-full h-12 px-4 bg-secondary/20 border border-border rounded-xl outline-none font-bold text-sm"
                >
                  <option value="">-- Choisir un poste --</option>
                  {postes.map((p) => (
                    <option key={p.JobPostingId} value={p.JobPostingId}>
                      {p.PositionTitle}
                    </option>
                  ))}
                </select>
              </div>

              {shareLink && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs  tracking-widest">
                    <Share2 className="w-4 h-4" /> Lien public
                  </div>
                  <div className="relative group">
                    <input
                      value={shareLink}
                      readOnly
                      className="w-full h-11 pl-4 pr-12 bg-secondary/30 border border-border rounded-xl text-[10px] font-bold truncate text-muted-foreground"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        toast.success('Lien copié !');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                      title="Copier le lien"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => window.open(shareLink, '_blank')}
                    className="w-full h-12 bg-secondary text-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all border border-border"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Prévisualiser
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
