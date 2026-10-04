import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Phone, MapPin, Briefcase, Linkedin, Github, Save, Edit } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../redux/store';
import { getDeptAvatar } from '../util/avatarHelper';
import { api } from '../helpers/apiClient';

export function Profile() {
  const user = useSelector((s: RootState) => s.auth.user);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    prename: '',
    email: '',
    phone: '',
    address: '',
    bio: '',
    skills: [] as string[],
    linkedin: '',
    github: '',
  });

  const fetchFullUser = async () => {
    if (!user?.Id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await api.get<any>(`/api/Users/${user.Id}`);
      const nameVal = data.name || data.Name;
      const prenameVal = data.prename || data.Prename;
      const emailVal = data.email || data.Email;
      const phoneVal = data.telephone || data.Telephone;
      const addressVal = data.adresse || data.Adresse;
      const bioVal = data.bio || data.Bio;
      const skillsVal = data.skills || data.Skills;
      const linkedinVal = data.linkedin || data.Linkedin;
      const githubVal = data.github || data.Github;

      setFormData({
        name: nameVal || user.Username || user.Name || '',
        prename: prenameVal || '',
        email: emailVal || user.Email || '',
        phone: phoneVal || '',
        address: addressVal || '',
        bio: bioVal || '',
        skills: skillsVal ? (typeof skillsVal === 'string' ? JSON.parse(skillsVal) : skillsVal) : [],
        linkedin: linkedinVal || '',
        github: githubVal || '',
      });
    } catch (e) {
      console.error('Error fetching user profile:', e);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.Username || user.Name || '',
        email: user.Email || '',
      }));
      fetchFullUser();
    } else {
      setLoading(false);
    }
  }, [user?.Id]);

  const [newSkill, setNewSkill] = useState('');

  const handleSave = async () => {
    try {
      await api.put('/api/Users/profile', {
        name: formData.name,
        prename: formData.prename,
        telephone: formData.phone,
        adresse: formData.address,
        // bio: formData.bio, // Add these if backend supports them later
      });
      
      toast.success('Profil mis à jour avec succès');
      setIsEditing(false);
    } catch (e) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
      toast.success('Compétence ajoutée');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
    toast.success('Compétence supprimée');
  };

  if (loading && !formData.email) {
    return (
      <div className="p-8 flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles et professionnelles</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="h-12 px-6 bg-primary text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(false)}
              className="h-12 px-6 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="h-12 px-6 bg-primary text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-3xl p-8 text-center shadow-xl h-fit"
          >
            <div className="relative w-32 h-32 mx-auto mb-6">
              <img
                src={getDeptAvatar(user?.DepartmentName || user?.Department?.Name || user?.department, user?.Role || user?.role)}
                alt={formData.name}
                className="w-full h-full rounded-full object-cover border-4 border-primary/10 shadow-lg"
              />
            </div>
            
            <h2 className="text-2xl font-bold mb-1">{formData.name} {formData.prename}</h2>
            <p className="text-muted-foreground text-sm font-medium mb-6">{user?.Role || 'Membre'}</p>
            
            {/* Social Media Links MOVED HERE */}
            <div className="pt-6 border-t border-border">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Réseaux Sociaux</p>
              {isEditing ? (
                <div className="space-y-4 text-left">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                      <Linkedin className="w-3 h-3" />
                      LinkedIn
                    </div>
                    <input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/..."
                      className="w-full h-10 px-3 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                      <Github className="w-3 h-3" />
                      GitHub
                    </div>
                    <input
                      type="url"
                      value={formData.github}
                      onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      placeholder="https://github.com/..."
                      className="w-full h-10 px-3 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  {formData.linkedin && (
                    <a
                      href={formData.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 bg-primary/5 text-primary rounded-xl flex items-center justify-center hover:bg-primary/10 transition-all hover:scale-110"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {formData.github && (
                    <a
                      href={formData.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 bg-primary/5 text-primary rounded-xl flex items-center justify-center hover:bg-primary/10 transition-all hover:scale-110"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                  {!formData.linkedin && !formData.github && (
                    <p className="text-xs text-muted-foreground italic">Aucun réseau lié</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Details Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-3xl p-8 shadow-sm"
          >
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" />
              Informations Personnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-12 px-4 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <div className="h-12 px-4 flex items-center bg-secondary/10 rounded-xl font-medium border border-transparent">
                    {formData.name || 'Non renseigné'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Prénom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.prename}
                    onChange={(e) => setFormData({ ...formData, prename: e.target.value })}
                    className="w-full h-12 px-4 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <div className="h-12 px-4 flex items-center bg-secondary/10 rounded-xl font-medium border border-transparent">
                    {formData.prename || 'Non renseigné'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full h-12 px-4 bg-secondary/10 border border-border rounded-xl outline-none opacity-60 cursor-not-allowed"
                  />
                ) : (
                  <div className="h-12 px-4 flex items-center bg-secondary/10 rounded-xl font-medium border border-transparent">
                    {formData.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Téléphone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-12 px-4 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <div className="h-12 px-4 flex items-center bg-secondary/10 rounded-xl font-medium border border-transparent">
                    {formData.phone || 'Non renseigné'}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Adresse</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full h-12 px-4 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <div className="h-12 px-4 flex items-center bg-secondary/10 rounded-xl font-medium border border-transparent">
                    {formData.address || 'Non renseignée'}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Presentation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-3xl p-8 shadow-sm"
          >
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Présentation (Bio)
            </h3>
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Décrivez votre parcours..."
                className="w-full h-32 px-4 py-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 resize-none font-medium"
              />
            ) : (
              <p className="text-muted-foreground leading-relaxed italic">
                {formData.bio || "Aucune bio n'a été rédigée."}
              </p>
            )}
          </motion.div>

          {/* Skills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-3xl p-8 shadow-sm"
          >
            <h3 className="text-lg font-bold mb-6">Compétences</h3>
            {isEditing && (
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                  placeholder="Ajouter une compétence..."
                  className="flex-1 h-12 px-4 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={handleAddSkill}
                  className="h-12 px-6 bg-primary text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Ajouter
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {formData.skills.length > 0 ? formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-4 py-2 bg-primary/5 text-primary rounded-xl text-sm font-bold border border-primary/10 flex items-center gap-2"
                >
                  {skill}
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-error transition-colors w-4 h-4 flex items-center justify-center rounded-full hover:bg-error/10"
                    >
                      ×
                    </button>
                  )}
                </span>
              )) : (
                <p className="text-sm text-muted-foreground italic">Aucune compétence renseignée.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
