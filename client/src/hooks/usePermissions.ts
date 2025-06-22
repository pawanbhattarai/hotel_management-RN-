
import { useAuth } from "./useAuth";

export interface ModulePermission {
  read: boolean;
  write: boolean;
  delete: boolean;
}

export type UserPermissions = Record<string, ModulePermission>;

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (module: string, action: 'read' | 'write' | 'delete'): boolean => {
    if (!user) return false;

    // Superadmin has all permissions
    if (user.role === "superadmin") return true;

    // Built-in roles permissions
    if (user.role === "branch-admin") {
      // Branch admin has most permissions except user management and some settings
      const restrictedModules = ['users', 'branches', 'settings'];
      if (restrictedModules.includes(module)) return false;
      return true;
    }

    if (user.role === "front-desk") {
      // Front desk has limited permissions
      const allowedModules = ['dashboard', 'reservations', 'rooms', 'guests', 'billing'];
      if (!allowedModules.includes(module)) return false;
      
      // Front desk can't delete most things
      if (action === 'delete' && !['reservations'].includes(module)) return false;
      return true;
    }

    // Custom role permissions
    if (user.role === "custom" && user.customPermissions) {
      const modulePermissions = user.customPermissions[module];
      if (!modulePermissions) return false;
      return modulePermissions[action] || false;
    }

    return false;
  };

  const canAccess = (module: string): boolean => {
    return hasPermission(module, 'read');
  };

  const canWrite = (module: string): boolean => {
    return hasPermission(module, 'write');
  };

  const canDelete = (module: string): boolean => {
    return hasPermission(module, 'delete');
  };

  const getModulePermissions = (module: string): ModulePermission => {
    return {
      read: hasPermission(module, 'read'),
      write: hasPermission(module, 'write'),
      delete: hasPermission(module, 'delete'),
    };
  };

  return {
    hasPermission,
    canAccess,
    canWrite,
    canDelete,
    getModulePermissions,
    userPermissions: user?.customPermissions || {},
  };
}
