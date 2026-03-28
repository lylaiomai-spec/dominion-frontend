import {Character} from './Character';

export interface Faction {
  id: number,
  name: string,
  parent_id: number|null,
  level: number,
  description: string|null,
  icon: string|null,
  faction_status: number,
  show_on_profile: boolean,
  characters: Character[]
}

export interface FactionShort {
  id: number,
  name: string,
}
