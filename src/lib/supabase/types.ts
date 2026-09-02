export type Profile = {
  id: string;
  email: string;
  enable_yandex_cdn?: boolean | null;
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
  /** On relay: classic TCP Reality URL (:8443) alongside primary xHTTP */
  vless_tcp_config_url?: string | null;
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
  /** Yandex CDN path (on exit) */
  cdn_status?: string | null;
  cdn_domain?: string | null;
  cdn_origin_domain?: string | null;
  cdn_relay_domain?: string | null;
  cdn_uuid?: string | null;
  cdn_path?: string | null;
  cdn_padding_key?: string | null;
  cdn_email?: string | null;
  cdn_origin_ip?: string | null;
  cdn_origin_ssh_port?: number | null;
  cdn_origin_ssh_username?: string | null;
  cdn_origin_ssh_password?: string | null;
  cdn_exit_listen_port?: number | null;
  cdn_vless_config_url?: string | null;
  status: ServerStatus;
  created_at: string;
  updated_at: string;
};

export type DonationStatus = "pending" | "confirmed" | "rejected";

export type BotUser = {
  id: string;
  telegram_id: number;
  telegram_username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  xray_uuid?: string | null;
  vless_config_url?: string | null;
  vless_tcp_config_url?: string | null;
  is_active: boolean;
  subscribed_until?: string | null;
  renewal_reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type DonationPaymentMethod = "manual" | "stars" | "admin";

export type Donation = {
  id: string;
  bot_user_id: string;
  amount_rub: number;
  month: string;
  status: DonationStatus;
  payment_method?: DonationPaymentMethod | string | null;
  stars_amount?: number | null;
  telegram_payment_charge_id?: string | null;
  note?: string | null;
  confirmed_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type MonthlyGoal = {
  month: string;
  target_rub: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
};
