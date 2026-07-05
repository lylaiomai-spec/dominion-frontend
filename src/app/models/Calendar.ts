export interface CalendarOption {
  id: number;
  name: string;
}

export interface PlaceholderDef {
  type: 'number' | 'list';
  name: string;
  position: number;
  is_nullable: boolean;
  is_hidden_negative?: boolean;
  min_value?: number | null;
  max_value?: number | null;
  value_list?: string[];
}

export interface CalendarFreeFormatDate {
  format_strings: string[];
  placeholders: PlaceholderDef[];
}

export interface CalendarSetting {
  id: number;
  name: string;
  free_format_date: CalendarFreeFormatDate;
}
