export const APP_NAME = 'TriCareer';
export const APP_DESCRIPTION = "Plateforme RH intelligente basée sur l'IA";

export const ROLE_LABELS = {
  admin: 'Administrateur',
  hr: 'Responsable RH',
  team_leader: 'Team Leader',
  candidate: 'Candidat',
} as const;

export const STATUS_LABELS = {
  pending: 'En attente',
  reviewed: 'Examiné',
  shortlisted: 'Présélectionné',
  rejected: 'Rejeté',
} as const;

export const CATEGORY_LABELS = {
  technical: 'Technique',
  behavioral: 'Comportemental',
  situational: 'Situationnel',
} as const;

export const DIFFICULTY_LABELS = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
} as const;

export const RECOMMENDATION_LABELS = {
  hire: 'Recommandé',
  review: 'À revoir',
  reject: 'Non recommandé',
} as const;

