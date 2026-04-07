import {CharacterShort, CustomFieldsData, ShortMask} from './Character';

export interface Episode {
  id: number;
  name: string;
  characters: CharacterShort[];
  masks: ShortMask[];
  custom_fields: CustomFieldsData;
  open_to_everyone: boolean;
  episode_status?: number;
}

export interface EpisodeFilterRequest {
  subforum_ids: number[];
  character_ids: number[];
  faction_ids: number[];
  page: number;
}

export interface EpisodeListItem {
  id: number;
  name: string;
  topic_id: number;
  subforum_id: number;
  subforum_name: string;
  topic_status: number;
  last_post_date: string;
}

export interface CreateEpisodeRequest {
subforum_id: number;
name: string;
character_ids: number[];
custom_fields: any;
open_to_everyone: boolean;
}
