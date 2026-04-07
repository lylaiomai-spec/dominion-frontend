export enum AdditionalNavlinkType {
  Link = 0,
  Login = 1
}

export interface AdditionalNavlinkConfig {
  url?: string;
  [key: string]: any;
}

export interface AdditionalNavlink {
  id: number;
  title: string;
  type: AdditionalNavlinkType;
  config: AdditionalNavlinkConfig;
  roles: number[];
  is_inactive: boolean;
}
