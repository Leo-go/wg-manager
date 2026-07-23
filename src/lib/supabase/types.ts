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

/** exit = abroad node; relay = RU hop (Layer 1) */
export type ServerRole = "exit" | "relay";

export type Server = {
  id: string;
  user_id: string;
  name: string;
  ip_address: string;
  ssh_port: number;
  /** SSH login user; default root — see scripts/ssh-username-column.sql */
  ssh_username?: string | null;
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
  /** exit (default) | relay — see scripts/relay-columns.sql */
  role?: ServerRole | string | null;
  /** For role=relay: parent exit server */
  exit_server_id?: string | null;
  /** On exit: client VLESS URL that goes via RU relay */
  relay_vless_config_url?: string | null;
  relay_listen_port?: number | null;
  relay_uuid?: string | null;
  relay_public_key?: string | null;
  relay_short_id?: string | null;
  relay_path?: string | null;
  relay_status?: string | null;
  status: ServerStatus;
  created_at: string;
  updated_at: string;
};
