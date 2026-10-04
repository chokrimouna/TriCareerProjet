export const getRoleRedirect = (role: string): string => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return '/admin/dashboard';
    case 'rh':
      return '/rh/dashboard';
    case 'teamleader':
      return '/team-leader/dashboard';
    case 'candidate':
      return '/candidate/dashboard';
    default:
      return '/dashboard';
  }
};
