export interface FactionInfo {
  id: number;
  level: number;
  human_name: string;
}

export interface FactionSetting {
  id: number;
  level: number;
  human_name: string;
  parent_faction_id: number | null;
  parent?: FactionInfo;
}
