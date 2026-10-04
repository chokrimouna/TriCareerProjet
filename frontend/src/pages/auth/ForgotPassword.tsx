import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    toast.success('Email de récupération envoyé !');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>

        {!isSubmitted ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Mot de passe oublié ?</h2>
              <p className="text-muted-foreground">
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full h-12 pl-11 pr-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Envoyer le lien
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold">Email envoyé !</h2>
            <p className="text-muted-foreground">
              Vérifiez votre boîte mail à l'adresse <strong>{email}</strong> pour réinitialiser votre mot de passe.
            </p>
            <Link
              to="/login"
              className="inline-block mt-4 text-primary hover:underline font-medium"
            >
              Retour à la connexion
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
