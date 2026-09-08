// user admin roles:
const ADMIN_ROLES = ['SADMIN', 'ADMIN', 'MAPC_USER'];

// takes a user object (response from /me endpoint) and returns if the user is an admin
export const isUserAdmin = (user) => {
  if (!user) return false;

  const isAdminRole = ADMIN_ROLES.includes(user.role);
  const isFromMAPC = user.organization === 'MAPC'; // TODO: we will have non-mapc users in the future
  return isAdminRole && isFromMAPC;
}