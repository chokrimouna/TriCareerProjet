export type UserRole = 'admin' | 'hr' | 'rh' | 'team_leader' | 'teamleader' | 'candidate';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  phone?: string;
  address?: string;
  bio?: string;
  skills?: string[];
  linkedin?: string;
  github?: string;
  etat?: boolean;
}

export interface CV {
  id: string;
  candidateName: string;
  candidateEmail: string;
  fileName: string;
  uploadDate: string;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected';
  aiScore: number;
  skills: string[];
  experience: string;
  summary: string;
  matchingScore?: number;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswer?: string;
}

export interface AIDecision {
  id: string;
  candidateId: string;
  recommendation: 'hire' | 'review' | 'reject';
  confidence: number;
  reasoning: string[];
  strengths: string[];
  concerns: string[];
  comparison?: {
    rank: number;
    totalCandidates: number;
  };
}

export interface Activity {
  id: string;
  type: 'cv_uploaded' | 'candidate_shortlisted' | 'interview_generated' | 'decision_made';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  position: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  interviewer: string;
  location?: string;
  notes?: string;
  rating?: number;
  emojiRating?: string;
}

export interface ManagerNote {
  id: string;
  candidateId: string;
  managerId: string;
  managerName: string;
  content: string;
  emoji: string;
  rating: number;
  createdAt: string;
  category: 'technical' | 'soft_skills' | 'cultural_fit' | 'general';
}

export interface ExamSession {
  id: string;
  candidateId: string;
  examTitle: string;
  duration: number;
  startedAt?: string;
  completedAt?: string;
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';
  timeRemaining: number;
  questions: ExamQuestion[];
  answers: Record<string, string>;
  availableFrom?: string;
  availableTo?: string;
  selectedDate?: string;
}

export interface ExamQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'text' | 'code';
  options?: string[];
  correctAnswer?: string;
  points: number;
}

export interface InterviewSession {
  id: string;
  interviewId: string;
  candidateName: string;
  position: string;
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  duration: number;
  elapsedTime: number;
  sections: InterviewSection[];
}

export interface InterviewSection {
  id: string;
  title: string;
  notes: string;
  rating: number;
  emoji: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface Application {
  id: string;
  candidateId: string;
  position: string;
  company: string;
  status: 'applied' | 'screening' | 'interview' | 'test' | 'offer' | 'rejected';
  appliedDate: string;
  lastUpdate: string;
  nextStep?: string;
  nextStepDate?: string;
}

export interface Task {
  id: string;
  candidateId: string;
  title: string;
  description: string;
  type: 'test' | 'interview' | 'document' | 'other';
  dueDate: string;
  status: 'pending' | 'completed';
  completedAt?: string;
}

