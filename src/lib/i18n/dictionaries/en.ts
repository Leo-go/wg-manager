import type { Dictionary } from "@/lib/i18n/types";

export const en: Dictionary = {
  meta: {
    title: "WG Manager",
    description:
      "Install VLESS Reality on your VPS: SSH setup, QR, and a ready client link",
  },
  common: {
    brand: "WG Manager",
    loading: "Loading...",
    cancel: "Cancel",
    close: "Close",
    copy: "Copy",
    copied: "Copied",
    back: "Back",
    continue: "Continue",
    language: "Language",
    russian: "Русский",
    english: "English",
  },
  landing: {
    headline: "WG Manager",
    tagline:
      "You buy the VPS — we install VLESS Reality over SSH and give you a ready QR / client link.",
    cta: "Get started",
    signIn: "Sign in",
    whatTitle: "What we do",
    whatLead:
      "This is not a hosted “VPN subscription”. The server is yours. WG Manager is a control panel that SSHs in and configures Xray (VLESS + Reality) on your machine.",
    whatItems: [
      {
        title: "Your VPS, your keys",
        body: "You pay the provider (e.g. Timeweb). We don’t sell seats on someone else’s box or keep your traffic.",
      },
      {
        title: "VLESS Reality in minutes",
        body: "One Setup VPN click: Xray, Reality keys, port 443, a vless:// link and QR for Hiddify / v2rayN / Streisand.",
      },
      {
        title: "Client apps & QR import",
        body: "Scan the QR or paste vless:// into Hiddify, v2rayN, Streisand, and other Reality clients — no hand-edited configs.",
      },
    ],
    howTitle: "How to start",
    howSteps: [
      {
        title: "Buy a VPS",
        body: "We recommend Timeweb Cloud via the partner link. Add our SSH key at create time — no root password needed in the panel.",
      },
      {
        title: "Add the server in WG Manager",
        body: "Enter IPv4 and SSH port. Prefer SSH key auth; password is a fallback.",
      },
      {
        title: "Run Setup VPN",
        body: "Wait for install, import the QR into your client. Done.",
      },
    ],
    osTitle: "Which OS to pick when buying a VPS",
    osLead:
      "The installer expects a normal Ubuntu/Debian image with systemd, apt, and root SSH. Wrong OS is a common setup failure.",
    osRecommendedTitle: "Recommended",
    osRecommended: [
      "Ubuntu 24.04 LTS (best choice)",
      "Ubuntu 22.04 LTS",
      "Debian 12 (Bookworm)",
    ],
    osOkTitle: "Usually fine",
    osOk: [
      "Ubuntu 20.04 LTS (aging — prefer 22.04/24.04)",
      "Debian 11 (Bullseye)",
    ],
    osAvoidTitle: "Don’t use with this panel",
    osAvoid: [
      "Windows Server / any Windows",
      "Docker-only / app-platform images without root SSH",
      "Minimal Alpine / OpenWRT without systemd and apt",
      "Control-panel-only access (ISPmanager etc.) — root SSH is required",
    ],
    osTip:
      "In Timeweb: Ubuntu 24.04 or 22.04, abroad region (e.g. NL), IPv4 required.",
    relayTitle: "Direct access",
    relayBody:
      "After Setup VPN you get a QR and vless:// for a direct connection to your abroad VPS.",
    disclaimer:
      "Use within applicable law. Hosting ads: Timeweb partner link — you pay the provider directly.",
  },
  auth: {
    signIn: "Sign In",
    signUp: "Sign Up",
    createAccount: "Create Account",
    subtitle: "WG Manager — VLESS Reality on your VPS",
    email: "Email",
    password: "Password",
    loading: "Loading...",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    backHome: "Back to home",
    accountCreated:
      "Account created. Check your email to confirm, or sign in if confirmation is disabled.",
    authFailed: "Authentication failed",
  },
  nav: {
    servers: "Servers",
    logOut: "Log out",
  },
  dashboard: {
    title: "My Servers",
    getVps: "Get VPS via Timeweb",
    addServer: "Add Server",
    demoBuy: "Demo: API buy",
    empty: "No servers yet. Add your first VPS to get started.",
    name: "Name",
    ip: "IP",
    status: "Status",
    setup: "Setup",
    actions: "Actions",
    ready: "Ready",
    installing: "Installing",
    failed: "Failed",
    pending: "Pending",
    viewConfig: "View config",
    retrySetup: "Retry setup",
    viewProgress: "View progress",
    setupVpn: "Setup VPN",
    badgeRelay: "RU relay",
    badgePlusRelay: "+relay",
    deleteConfirm:
      'Delete server "{name}" ({ip})?\n\nThis removes it from WG Manager only — Xray on the VPS is not uninstalled.',
    deleteFailed: "Could not delete server",
  },
  partner: {
    title: "Get a VPS via Timeweb (partner link)",
    description:
      "You buy the server at Timeweb. We only set up VLESS Reality — no root password needed if you add our SSH public key.",
    step1Title: "1. Open Timeweb with the partner link",
    step1Body:
      "Register / sign in and create a cloud server. Hosting is billed by Timeweb.",
    step1Link: "timeweb.cloud (referral)",
    step2Title: "2. Add our SSH public key (recommended)",
    step2Body:
      "When creating the VPS in Timeweb: open SSH keys → add a new key → paste the public key below → select it for the new server. Then you never need to save the root password in WG Manager.",
    copyKey: "Copy public key",
    keyMissing:
      "Platform public key is not configured yet (NEXT_PUBLIC_WG_SSH_PUBLIC_KEY). Ask the operator to set it, or use root password as a fallback when adding the server.",
    step3Title: "3. Wait until the server is online",
    step3Body:
      "Copy the IPv4 address from the Timeweb panel (IPv6-only is not enough for most clients).",
    step4Title: "4. Add the server here → Setup VPN",
    step4Body:
      "Choose “SSH key (recommended)” so we do not store your root password. Password auth remains available as an alternative.",
    haveIp: "I have an IP — add server",
    osTip:
      "In Timeweb: Ubuntu 24.04 or 22.04, abroad region (e.g. NL), IPv4 required.",
  },
  addServer: {
    title: "Add Server",
    name: "Server Name",
    namePlaceholder: "My VPN Server",
    ipv4: "IPv4 Address",
    sshPort: "SSH Port",
    auth: "SSH authentication",
    sshKey: "SSH key",
    sshKeyHint: "Recommended — safer",
    password: "Root password",
    passwordAlt: "Alternative",
    rootPassword: "Root Password",
    rootPasswordPlaceholder: "Enter root password",
    vlessPort: "VLESS Port",
    vlessPortTip:
      "Default 443 — best for Reality in RU; installer probes SNI reachability.",
    helpPrivateKey:
      "Setup uses the platform private key on the server (WG_SSH_PRIVATE_KEY).",
    helpPasswordRisk:
      "Less safe: the password is stored in the database so setup can SSH. Prefer SSH key when possible.",
    saving: "Saving...",
    submit: "Add Server",
    helpNoPassword:
      "With SSH key auth we don’t store a password. Add the platform public key on the VPS first.",
    failed: "Failed to add server",
    errors: {
      passwordRequired: "Root password is required in password mode",
      platformKeyMissing:
        "Platform SSH key is not configured. Use password mode, or ask the operator to set NEXT_PUBLIC_WG_SSH_PUBLIC_KEY / WG_SSH_PRIVATE_KEY.",
      notAuthenticated: "Not authenticated",
      missingId: "Server was created but ID is missing",
    },
  },
  sni: {
    label: "SNI Domain (Mask)",
    help: "Reality uses this domain as camouflage. Installer verifies the dest is reachable from your VPS (falls back if needed).",
    recommended: "Recommended",
    custom: "Custom",
  },
  editServer: {
    title: "Edit server",
    name: "Name",
    ipv4: "IPv4 address",
    ipv4Tip: "Fix a mistyped IP here, then run Setup again if needed.",
    sshPort: "SSH port",
    saving: "Saving…",
    save: "Save",
    errors: {
      nameRequired: "Name is required",
      ipRequired: "IP address is required",
      failed: "Failed to update server",
    },
  },
  setup: {
    title: "Setup VPN",
    subtitle: "Install VLESS Reality on this VPS over SSH",
    back: "Back",
    details: "Server connection details",
    ip: "IP Address",
    sshPort: "SSH Port",
    sni: "SNI Domain",
    vlessPort: "VLESS Port",
    installation: "Installation",
    installationHint: "This usually takes a few minutes. Keep this page open.",
    setupVpn: "Setup VPN",
    installing: "Installing on the remote server...",
    retry: "Retry setup",
    readyTitle: "VPN is ready",
    readyHint: "Scan the QR code or copy the VLESS URL into your client app.",
    sniTip:
      "Using SNI: {sni}. If connection fails, try changing the SNI domain above and re-running setup.",
    qrAlt: "VLESS QR code",
    relayQrAlt: "RU relay VLESS QR code",
    previousFailed: "Previous setup failed. You can retry installation.",
    serverNotFound: "Server not found",
    setupFailed: "Setup failed",
    diagnosticsTitle: "Installation diagnostics",
    directUrl: "Direct VLESS URL (exit)",
    relayUrl: "Relay VLESS URL (via this RU hop)",
    reRun: "Re-run setup",
    backServers: "Back to servers",
    relayCardTitle: "RU Relay (v2 Layer 1)",
    relayCardHint:
      "Optional Russian hop: traffic looks like a local site, then exits abroad through this VPS.",
    addRelay: "Add RU Relay",
    replaceRelay: "Replace / reinstall RU relay",
    viaRelay: "Via RU relay (use when direct is blocked)",
    statusReady: "Ready",
    statusInstalling: "Installing",
    statusFailed: "Failed",
    statusPending: "Pending setup",
    stepConnect: "Connect via SSH",
    stepUpload: "Upload installer script",
    stepUpdate: "Update system packages",
    stepInstall: "Install Xray / VLESS Reality",
    stepConfigure: "Generate keys & config",
    stepFinalize: "Save VLESS URL",
    errors: {
      portInUse:
        "Script execution failed: port {port} is already in use. Stop the conflicting service on the VPS, then retry.",
      portInUseGeneric:
        "Script execution failed: port is already in use. Stop the conflicting service on the VPS, then retry.",
      missingPassword:
        "Cannot start setup: SSH password is missing. Edit or re-add the server with a password.",
      missingIp: "Cannot start setup: server IP address is missing.",
      serverNotFound:
        "Server not found. It may have been deleted — return to the dashboard.",
      parseVless:
        "Setup finished on the VPS but the app could not read the VLESS URL. Check diagnostics and retry.",
    },
  },
  relay: {
    title: "Add RU Relay",
    description:
      "Layer 1: client → Russian VPS (Reality) → {name} (exit) → internet. Takes a few minutes — keep this open.",
    name: "Name",
    ipv4: "RU VPS IPv4",
    sshPort: "SSH port",
    auth: "SSH auth",
    sshKey: "SSH key",
    password: "Password",
    relaySni: "Relay SNI (client → RU)",
    relaySniHint: "Default mimics gosuslugi over Reality on :443.",
    install: "Install RU relay",
    installing: "Installing…",
    cancel: "Cancel",
  },
};
