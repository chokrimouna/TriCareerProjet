
export const getDeptAvatar = (deptName: string | undefined | null, roleName?: string | undefined | null): string => {
  const dept = (deptName || '').toLowerCase().trim();
  const role = (roleName || '').toLowerCase().trim();

  // Rule 1: Admins and RH always get the 109 character
  if (role.includes('admin') || role.includes('rh') || role.includes('hr') ||
    dept.includes('rh') || dept.includes('hr') || dept.includes('admin') || dept.includes('direction')) {
    return '/characters/109.png';
  }

  if (dept.includes('it') || dept.includes('tech') || dept.includes('dev') || dept.includes('informat')) {
    return '/characters/NeuronX.png';
  }
  if (dept.includes('design') || dept.includes('graph') || dept.includes('graphique')) {
    return '/characters/Genix.png';
  }
  if (dept.includes('redac') || dept.includes('rédac') || dept.includes('content') || dept.includes('edit')) {
    return '/characters/Vortex.png';
  }
  if (dept.includes('marketing') || dept.includes('comm')) {
    return '/characters/Stellareach.png';
  }
  if (dept.includes('seo') || dept.includes('search')) {
    return '/characters/Aur@nex.png';
  }
  if (dept.includes('modif') || dept.includes('modification')) {
    return '/characters/Savix.png';
  }
  if (dept.includes('cq') || dept.includes('qualit') || dept.includes('test')) {
    return '/characters/Planova.png';
  }

  return '/characters/109.png';
};
