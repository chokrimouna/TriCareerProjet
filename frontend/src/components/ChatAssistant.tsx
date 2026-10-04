import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { api } from '../helpers/apiClient';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

// Détermine le rôle normalisé de l'utilisateur connecté (admin / rh / teamleader / candidate)
function resolveRole(user: any): string {
  const raw = user?.Role ?? user?.role ?? '';
  const s = typeof raw === 'object' ? (raw?.Description ?? raw?.description ?? '') : String(raw);
  const r = s.toLowerCase();
  if (r.includes('admin')) return 'admin';
  if (r === 'rh' || r === 'hr' || r.includes('rh')) return 'rh';
  if (r.includes('lead')) return 'teamleader';
  return 'candidate';
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Assistant Admin',
  rh: 'Assistant RH',
  teamleader: 'Assistant Team Leader',
  candidate: 'Assistant Candidat',
};

const ROLE_HINT: Record<string, string> = {
  admin: 'Gestion des utilisateurs, des offres, des départements, statistiques…',
  rh: 'Stratégie de recrutement, analyse de CV, tests, entretiens, décision…',
  teamleader: 'Évaluation technique, quiz, entretiens, classement des profils…',
  candidate: 'Postuler, passer vos tests, comprendre votre score, préparer un entretien…',
};

export function ChatAssistant() {
  const user = useSelector((s: RootState) => s.auth.user);
  const role = resolveRole(user);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, loading]);

  // Le chatbot d'aide n'est PAS affiché pour les candidats (uniquement admin / RH / team leader).
  if (role === 'candidate') return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const data = await api.post<any>('/api/Analysis/chat', {
        role,
        page: window.location.pathname,
        messages: next.slice(-10),
      });
      const reply = data?.reply || data?.error || "Désolé, je n'ai pas pu répondre.";
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "Assistant indisponible pour le moment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-[#DC2626] to-[#F87171] text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-all"
          title="Assistant IA"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[370px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-3rem)] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#DC2626] to-[#F87171] text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold text-sm">{ROLE_LABEL[role]}</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg" title="Fermer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Bonjour 👋 Je suis votre assistant IA TriCareer.</p>
                <p className="text-xs">{ROLE_HINT[role]}</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-secondary text-foreground rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-muted-foreground animate-pulse">L'assistant réfléchit…</div>}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-border flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Écrivez votre message…"
              className="flex-1 h-10 px-3 rounded-xl bg-secondary/40 border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button
              onClick={send}
              disabled={loading}
              className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-60 shrink-0"
              title="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
