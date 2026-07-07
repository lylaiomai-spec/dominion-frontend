export interface ExternalApp {
  id: number;
  name: string;
  api_key: string;
  status: boolean;
  user_id: number | null;
}

export interface ExternalAppPermission {
  external_app_id: number;
  subforum_id: number;
  permission: string;
}
