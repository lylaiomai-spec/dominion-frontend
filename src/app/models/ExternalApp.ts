export interface ExternalApp {
  id: number;
  name: string;
  api_key: string;
  status: boolean;
  user_id: number | null;
}
