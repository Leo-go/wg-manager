export type Profile = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type InstallationStatus =
  | "pending"
  | "installing"
  | "completed"
  | "error";

export type ServerStatus = "active" | "inactive" | "error";

export type Server = {
  id: string;
  user_id: string;
  name: string;
  ip_address: string;
  ssh_port: number;
  ssh_password?: string | null;
  ssh_private_key?: string | null;
  wg_public_key?: string | null;
  wg_private_key?: string | null;
  wg_preshared_key?: string | null;
  wg_endpoint?: string | null;
  vless_uuid?: string | null;
  vless_port?: number | null;
  reality_public_key?: string | null;
  reality_private_key?: string | null;
  sni_domain?: string | null;
  vless_config_url?: string | null;
  installation_status?: InstallationStatus | null;
  last_check?: string | null;
  /** manual | timeweb | … (optional column — see scripts/timeweb-columns.sql) */
  provider?: string | null;
  provider_server_id?: string | null;
  status: ServerStatus;
  created_at: string;
  updated_at: string;
};
