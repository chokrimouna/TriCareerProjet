import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Mail, Send, RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';
import { Switch } from '../components/ui/switch';

type SmtpSettingsResponse = {
  host: string;
  port: number;
  enableSsl: boolean;
  username: string;
  fromName: string;
  hasPassword: boolean;
  isCustomConfigured: boolean;
};

export function SmtpSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [enableSsl, setEnableSsl] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromName, setFromName] = useState('TriCareer');
  const [hasPassword, setHasPassword] = useState(false);
  const [isCustomConfigured, setIsCustomConfigured] = useState(false);

  const [testEmail, setTestEmail] = useState('');
  const [lastTestResult, setLastTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<SmtpSettingsResponse>('/api/Settings/smtp');
      setHost(data.host || '');
      setPort(data.port || 587);
      setEnableSsl(data.enableSsl ?? true);
      setUsername(data.username || '');
      setFromName(data.fromName || 'TriCareer');
      setHasPassword(!!data.hasPassword);
      setIsCustomConfigured(!!data.isCustomConfigured);
    } catch {
      toast.error('Impossible de charger la configuration SMTP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSync = async () => {
    if (!host.trim() || !username.trim()) {
      toast.error('Le serveur (host) et le nom d\'utilisateur sont requis');
      return;
    }
    setSaving(true);
    try {
      const data = await api.put<SmtpSettingsResponse>('/api/Settings/smtp', {
        Host: host.trim(),
        Port: port,
        EnableSsl: enableSsl,
        Username: username.trim(),
        Password: password || null,
        FromName: fromName.trim() || 'TriCareer',
      });
      setHasPassword(!!data.hasPassword);
      setIsCustomConfigured(!!data.isCustomConfigured);
      setPassword('');
      toast.success('Configuration SMTP synchronisée — appliquée immédiatement, sans redémarrage');
    } catch (e: any) {
      toast.error(e?.message || 'Échec de la synchronisation');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      toast.error('Indiquez une adresse email de destination pour le test');
      return;
    }
    setTesting(true);
    setLastTestResult(null);
    try {
      const result = await api.post<{ success: boolean; message: string }>('/api/Settings/smtp/test', {
        Host: host.trim(),
        Port: port,
        EnableSsl: enableSsl,
        Username: username.trim(),
        Password: password || null,
        FromName: fromName.trim() || 'TriCareer',
        ToEmail: testEmail.trim(),
      });
      setLastTestResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e: any) {
      const message = e?.message || 'Échec du test';
      setLastTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const inputClass =
    'w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring';
  const labelClass = 'block text-sm font-medium mb-2';

  return (
    <div className="p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-center gap-3"
      >
        <motion.div
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
          className="w-12 h-12 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center"
        >
          <Settings className="w-6 h-6 text-[#DC2626]" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Paramètres SMTP</h1>
          <p className="text-sm text-muted-foreground">
            Configuration de l'envoi automatique d'emails aux candidats (tests, entretiens)
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Chargement de la configuration...
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-3xl bg-card border border-border rounded-2xl p-6 shadow-lg space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Serveur SMTP</span>
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-tight px-3 py-1 rounded-full ${
                isCustomConfigured
                  ? 'bg-success/10 text-success'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {isCustomConfigured ? 'Configuration personnalisée active' : 'Valeurs par défaut'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Host</label>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="587"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Nom d'utilisateur (adresse email d'envoi)</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mon.compte@exemple.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Mot de passe {hasPassword ? '(configuré — laisser vide pour ne pas changer)' : ''}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={hasPassword ? '••••••••' : 'Mot de passe d\'application'}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nom d'affichage (From)</label>
              <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="TriCareer" className={inputClass} />
            </div>
            <div className="flex items-center gap-3 pt-7">
              <Switch checked={enableSsl} onCheckedChange={setEnableSsl} className="data-[state=checked]:bg-success" />
              <span className="text-sm font-medium">SSL activé</span>
            </div>
          </div>

          <div className="border-t border-border pt-5 space-y-3">
            <label className={labelClass}>Email de test</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="destinataire@exemple.com"
                className={`${inputClass} flex-1`}
              />
              <motion.button
                onClick={handleTest}
                disabled={testing}
                whileHover={{ scale: testing ? 1 : 1.02 }}
                whileTap={{ scale: testing ? 1 : 0.97 }}
                className="h-11 px-6 rounded-lg bg-secondary text-secondary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {testing ? 'Envoi...' : 'Tester'}
              </motion.button>
            </div>

            {lastTestResult && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
                  lastTestResult.success
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'border-error/40 bg-error/10 text-error'
                }`}
              >
                {lastTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{lastTestResult.message}</span>
              </motion.div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <motion.button
              onClick={handleSync}
              disabled={saving}
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.97 }}
              className="h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {saving ? 'Synchronisation...' : 'Synchroniser'}
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
