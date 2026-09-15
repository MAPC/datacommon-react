// user admin roles:
const ADMIN_ROLES = ['SADMIN', 'ADMIN', 'MUNI_REP']; // includes MAPC admins and non-mapc muni reps
const MAPC_ROLES = ['SADMIN', 'ADMIN', 'MAPC_USER']; // includes non-admins within MAPC

// takes a user object (response from /me endpoint) and returns if the user is an admin
export const isUserAdmin = (user) => {
  if (!user) return false;

  const isAdminRole = ADMIN_ROLES.includes(user.role);
  return isAdminRole;
};

export const isUserMAPCAdmin = (user) => {
  if (!user) return false;

  const isAdminRole = ADMIN_ROLES.includes(user.role);
  const isFromMAPC = user.organization === 'MAPC';
  return isAdminRole && isFromMAPC;
};

export const isUserFromMAPC = (user) => {
  if (!user) return false;

  const hasMapcRole = MAPC_ROLES.includes(user.role);
  const isFromMAPC = user.organization === 'MAPC';
  return hasMapcRole && isFromMAPC;
};