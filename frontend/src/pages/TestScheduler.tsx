import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function TestScheduler() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const availableDates = [
    { date: '2026-04-15', label: 'Mardi 15 avril 2026', available: true },
    { date: '2026-04-16', label: 'Mercredi 16 avril 2026', available: true },
    { date: '2026-04-17', label: 'Jeudi 17 avril 2026', available: true },
    { date: '2026-04-18', label: 'Vendredi 18 avril 2026', available: true },
    { date: '2026-04-19', label: 'Samedi 19 avril 2026', available: false },
    { date: '2026-04-20', label: 'Dimanche 20 avril 2026', available: false },
  ];

  const availableTimes = [
    { time: '09:00', label: '09h00 - 10h30', available: true },
    { time: '10:30', label: '10h30 - 12h00', available: true },
    { time: '14:00', label: '14h00 - 15h30', available: false },
    { time: '15:30', label: '15h30 - 17h00', available: true },
    { time: '17:00', label: '17h00 - 18h30', available: true },
  ];

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Veuillez sélectionner une date et une heure');
      return;
    }

    toast.success('Votre créneau a été réservé avec succès');
    setTimeout(() => {
      navigate('/exam');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full bg-card border border-border rounded-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Planifier votre test technique</h1>
          <p className="text-muted-foreground">
            Sélectionnez une date et un créneau horaire pour passer votre test
          </p>
        </div>

        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning mb-1">Informations importantes</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Durée du test : 1h30</li>
                <li>• Vous devez choisir une date entre le 15 et 20 avril 2026</li>
                <li>• Une fois le créneau confirmé, vous recevrez un lien pour démarrer le test</li>
                <li>• Assurez-vous d'avoir une connexion internet stable</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Choisissez une date
            </h3>
            <div className="space-y-2">
              {availableDates.map((dateOption) => (
                <button
                  key={dateOption.date}
                  onClick={() => dateOption.available && setSelectedDate(dateOption.date)}
                  disabled={!dateOption.available}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedDate === dateOption.date
                      ? 'border-primary bg-primary/10'
                      : dateOption.available
                      ? 'border-border hover:border-primary/50'
                      : 'border-border bg-secondary opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{dateOption.label}</span>
                    {!dateOption.available && (
                      <span className="text-xs text-error">Non disponible</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Choisissez un créneau horaire
            </h3>
            {selectedDate ? (
              <div className="space-y-2">
                {availableTimes.map((timeOption) => (
                  <button
                    key={timeOption.time}
                    onClick={() => timeOption.available && setSelectedTime(timeOption.time)}
                    disabled={!timeOption.available}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedTime === timeOption.time
                        ? 'border-primary bg-primary/10'
                        : timeOption.available
                        ? 'border-border hover:border-primary/50'
                        : 'border-border bg-secondary opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{timeOption.label}</span>
                      {!timeOption.available && (
                        <span className="text-xs text-error">Complet</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center text-muted-foreground bg-secondary rounded-lg">
                Veuillez d'abord sélectionner une date
              </div>
            )}
          </div>
        </div>

        {selectedDate && selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8"
          >
            <h4 className="font-semibold mb-3">Récapitulatif de votre sélection</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date :</span>
                <span className="font-medium">
                  {availableDates.find(d => d.date === selectedDate)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Horaire :</span>
                <span className="font-medium">
                  {availableTimes.find(t => t.time === selectedTime)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Durée :</span>
                <span className="font-medium">1h30</span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 h-12 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime}
            className="flex-1 h-12 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Confirmer et continuer
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
