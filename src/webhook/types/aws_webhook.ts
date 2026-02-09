export interface AgencyUpdateData {
  user_id?: string;
  image?: string;
  nid_front?: string;
  nid_back?: string;
  tax_id_front?: string;
  tax_id_back?: string;
  driving_license_front?: string;
  driving_license_back?: string;
  [key: string]: string | undefined;
}
