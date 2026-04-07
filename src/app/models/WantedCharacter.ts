import { CustomFieldsData } from './Character';
import { Faction } from './Faction';

export interface WantedCharacter {
  id: number;
  name: string;
  is_claimed: boolean;
  author_user_id: number;
  date_created: string;
  character_claim_id: number | null;
  is_deleted: boolean | null;
  topic_id: number;
  custom_fields: CustomFieldsData;
  factions: Faction[] | null;
  wanted_character_status?: number;
}
