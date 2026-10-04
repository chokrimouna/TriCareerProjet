import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Search, Loader2, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';

type AdminNotification = {
  notificationId: number;
  message: string | null;
  timestamp: string | null;
  isRead: boolean | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
};

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async (query?: string) => {
    setLoading(true);
    try {
      const qs = query ? `?search=${encodeURIComponent(query)}` : '';
      const data = await api.get<AdminNotification[]>(`/api/Notification/admin/all${qs}`);
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleDelete = async (id: number) => {
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n.notificationId !== id));
    try {
      await api.delete(`/api/Notification/${id}`);
      toast.success('Notification supprimée');
    } catch {
      setNotifications(previous);
      toast.error('Échec de la suppression');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
            className="w-12 h-12 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center"
          >
            <Bell className="w-6 h-6 text-[#DC2626]" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Gestion des notifications</h1>
            <p className="text-sm text-muted-foreground">
              Vue d'ensemble des notifications envoyées aux utilisateurs
              {unreadCount > 0 ? ` — ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (utilisateur, message)..."
            className="w-full h-11 pl-11 pr-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground p-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Chargement des notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-muted-foreground p-12">
            Aucune notification {search ? 'ne correspond à cette recherche' : "n'a été envoyée pour le moment"}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/30 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Message</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Date</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {notifications.map((n, index) => (
                    <motion.tr
                      key={n.notificationId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: Math.min(index * 0.02, 0.6) }}
                      className="border-b border-border/60 last:border-0 hover:bg-secondary/15 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {n.isRead ? (
                          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#DC2626] fill-[#DC2626]/20" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{n.userName?.trim() || 'Utilisateur inconnu'}</div>
                        <div className="text-xs text-muted-foreground">{n.userEmail || `#${n.userId ?? '—'}`}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{n.message || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground text-right whitespace-nowrap">
                        {formatDate(n.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(n.notificationId)}
                          className="p-1.5 rounded-lg hover:bg-error/10 text-muted-foreground hover:text-error transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
