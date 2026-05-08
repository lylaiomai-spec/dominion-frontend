
export interface CurrencySettings {
  currency_name: string;
  icon_url: string;
}

export interface CurrencySettingsUpdateRequest {
  currency_name?: string;
  icon_url?: string;
}

export interface CurrencyTransactionMetadata {
  topic_id?: number;
  post_id?: number;
  note?: string | null;
}

export interface CurrencyTransaction {
  id: number;
  user_id: number;
  type: number;
  amount: number;
  datetime: string;
  datetime_localized: string;
  status: number;
  income_type_key: string | null;
  metadata: CurrencyTransactionMetadata | null;
}

export interface CurrencyTransactionsResponse {
  items: CurrencyTransaction[];
  total_pages: number;
  can_add: boolean;
}

export interface AddTransactionRequest {
  amount: number;
  type: 'income' | 'spend';
  income_type_key?: string | null;
  metadata?: { topic_id?: number; post_id?: number; note?: string | null } | null;
}

export interface CurrencyIncomeType {
  key: string;
  name: string;
  description: string;
  is_active: boolean;
  amount: number;
}

export interface CurrencySpendType {
  key: string;
  name: string;
  description: string;
  amount: number;
  is_active: boolean;
}
