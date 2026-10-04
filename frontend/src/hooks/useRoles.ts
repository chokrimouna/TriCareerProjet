import { useEffect, useState } from 'react';
import { api } from '../helpers/apiClient';

export type RoleOption = {
  Role_Id: number;
  Description: string;
};

export const useRoles = () => {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Array<{ Role_Id?: number; role_Id?: number; Description?: string; description?: string }>>('/api/Roles')
      .then((data) => {
        console.log('Roles fetched:', data);
        const normalized = (data || [])
          .map((r: any) => ({
            Role_Id: r.Role_Id ?? r.role_Id ?? r.RoleId ?? r.roleId ?? 0,
            Description: r.Description ?? r.description ?? '',
          }))
          .filter((r) => r.Role_Id > 0 && !!r.Description);
        setRoles(normalized);
      })
      .finally(() => setLoading(false));
  }, []);

  return { roles, loading };
};
