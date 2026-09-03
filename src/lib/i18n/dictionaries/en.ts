import type { Dictionary } from "@/lib/i18n/types";

export const en: Dictionary = {
  meta: {
    title: "VLESS Manager",
    description:
      "Install VLESS Reality on your VPS: SSH setup, QR, and a ready client link",
  },
  common: {
    brand: "VLESS Manager",
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
    terms: "Terms",
    privacy: "Privacy",
  },
  landing: {
    headline: "VLESS Manager",
    tagline:
      "You buy the VPS — we install VLESS Reality over SSH and give you a ready QR / client link.",
    cta: "Get started",
    signIn: "Sign in",
    whatTitle: "What we do",
    whatLead:
      "This is not a hosted “VPN subscription”. The server is yours. VLESS Manager is a control panel that SSHs in and configures Xray (VLESS + Reality) on your machine.",
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
        title: "Add the server in VLESS Manager",
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
    relayTitle: "What is RU Relay",
    relayBody:
      "Usually clients connect directly to your abroad exit via VLESS Reality. If direct connectivity in RU fails (or is unstable), add RU Relay on the setup page of your abroad exit server: traffic first lands on a VPS in RU and then exits abroad through your exit. After install, you’ll get a second VLESS URL/QR — “via Russia”.",
    cdnTitle: "What is Yandex CDN mode",
    cdnBody:
      "This is an advanced mode for difficult networks where direct and even RU Relay can still be filtered by mobile networks or whitelist-like routing. In this mode the client connects to a domain behind Yandex Cloud CDN instead of your VPS directly.",
    cdnHowTitle: "How it works",
    cdnHowItems: [
      "Path: client → Yandex CDN → Origin → Exit.",
      "Try normal direct VPN first.",
      "If direct is unstable, enable RU Relay.",
      "If that still is not enough and your account has access, configure CDN mode.",
    ],
    cdnAccessTitle: "CDN mode access",
    cdnAccessEnabled:
      "Your account can use CDN mode. On the exit server setup page you will see a separate Yandex CDN card.",
    cdnAccessRestricted:
      "CDN mode is not shown to every user. It is usually enabled for referral / approved accounts as an advanced scenario.",
    whitelistTitle: "Context: white IP addresses",
    whitelistBody:
      "Sometimes apps or networks check the apparent source IP against a whitelist. If direct exits don’t pass those checks, changing the exit or route may help.",
    whitelistLinkLabel: "white IP whitelist",
    disclaimer:
      "Use within applicable law. Hosting ads: Timeweb partner link — you pay the provider directly.",
  },
  funnel: {
    telegramTitle: "You came from the Telegram bot",
    telegramBody:
      "The shared friends-and-family VPN lives in the bot. Here you can build your own VPN on your VPS: buy a server, install Reality in minutes, get a QR.",
    backToBot: "Back to the bot",
    createOwnVpn: "Create your own VPN →",
  },
  auth: {
    signIn: "Sign In",
    signUp: "Sign Up",
    createAccount: "Create Account",
    subtitle: "VLESS Manager — VLESS Reality on your VPS",
    email: "Email",
    password: "Password",
    loading: "Loading...",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    backHome: "Back to home",
    accountCreated:
      "Account created. Check your email to confirm, or sign in if confirmation is disabled.",
    authFailed: "Authentication failed",
    legalNotice:
      "By continuing, you agree to the Terms of Use and Privacy Policy.",
  },
  nav: {
    servers: "Servers",
    admin: "Admin",
    info: "Information",
    about: "About",
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
    badgeCdn: "CDN",
    badgeCdnReady: "CDN ready",
    badgeCdnInstalling: "CDN installing",
    badgeCdnFailed: "CDN failed",
    badgeCdnPending: "CDN pending",
    deleteConfirm:
      'Delete server "{name}" ({ip})?\n\nThis removes it from VLESS Manager only — Xray on the VPS is not uninstalled.',
    deleteFailed: "Could not delete server",
    addRelay: "RU Relay",
    relayChildOf: "→ {name}",
    adminPanel: "Admin panel",
  },
  admin: {
    title: "Admin panel",
    subtitle:
      "Enable Yandex CDN access for selected users without touching SQL.",
    email: "Email",
    access: "Yandex CDN access",
    enabled: "Enabled",
    disabled: "Disabled",
    updated: "Updated",
    enable: "Enable",
    disable: "Disable",
    loading: "Saving...",
    failed: "Failed to update access",
    empty: "No users found.",
    back: "Back to servers",
    loadErrorTitle: "Failed to load users",
    loadErrorHint:
      "Check Vercel → Environment Variables: SUPABASE_SERVICE_ROLE_KEY (Production), then Redeploy. Get the key from Supabase → Project Settings → API → service_role.",
  },
  about: {
    pageTitle: "About",
    missionTitle: "Why VLESS Manager exists",
    missionBody:
      "We built this panel so self-hosted VPN setup takes minutes, not an evening of SSH and config files. You own the server and keys — we automate Xray (VLESS + Reality) and give you a ready QR code.",
    notTitle: "What we are not",
    notItems: [
      "Not a VPN subscription service and we don’t host your traffic",
      "No guarantee of bypassing every block — that depends on network, VPS, and client",
      "Not a substitute for legal or security advice for your organization",
    ],
    principlesTitle: "Principles",
    principles: [
      {
        title: "Your VPS, your control",
        body: "You pay the provider. We don’t access your traffic after setup.",
      },
      {
        title: "Transparent automation",
        body: "Setup runs over SSH with open scripts; diagnostics are visible in the UI.",
      },
      {
        title: "No extra billing layer",
        body: "No in-app subscriptions — only servers you add yourself.",
      },
    ],
    disclaimerTitle: "Disclaimer",
    disclaimerBody:
      "You choose the provider, region, and how you use the service. Follow applicable laws and hosting terms. VLESS Manager is provided “as is” without warranties. Timeweb partner links are referrals — hosting is billed directly by the provider. The operator is an individual (personal project); see Terms and Privacy for details.",
    legalLinksTitle: "Legal",
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
      "When creating the VPS in Timeweb: open SSH keys → add a new key → paste the public key below → select it for the new server. Then you never need to save the root password in VLESS Manager.",
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
    sshUsername: "SSH username",
    sshUsernameHint:
      "Default is root. For ubuntu/debian, enter that user — passwordless sudo (sudo -n) is required.",
    auth: "SSH authentication",
    sshKey: "SSH key",
    sshKeyHint: "Recommended — safer",
    password: "Password",
    passwordAlt: "Alternative",
    rootPassword: "SSH password",
    rootPasswordPlaceholder: "Enter SSH user password",
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
      passwordRequired: "SSH password is required in password mode",
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
    sshUsername: "SSH username",
    sshUsernameHint:
      "Non-root users need passwordless sudo on the VPS.",
    saving: "Saving…",
    save: "Save",
    errors: {
      nameRequired: "Name is required",
      ipRequired: "IP address is required",
      usernameInvalid: "Invalid SSH username",
      failed: "Failed to update server",
    },
  },
  setup: {
    title: "Setup VPN",
    subtitle: "Install VLESS Reality on this VPS over SSH",
    relayTitle: "Setup RU Relay",
    relaySubtitle:
      "Russian hop: clients connect to a VPS in RU, traffic exits through your abroad server",
    linkedExit: "Exit server: {name} ({ip})",
    back: "Back",
    details: "Server connection details",
    ip: "IP Address",
    sshPort: "SSH Port",
    sshUsername: "SSH username",
    sni: "SNI Domain",
    vlessPort: "VLESS Port",
    installation: "Installation",
    installationHint: "This usually takes a few minutes. Keep this page open.",
    setupVpn: "Setup VPN",
    setupRelay: "Install RU Relay",
    installing: "Installing on the remote server...",
    installingStuck:
      "A previous install looks stuck (the page was refreshed). You can retry.",
    retry: "Retry setup",
    readyTitle: "VPN is ready",
    readyHint: "Scan the QR code or copy the VLESS URL into your client app.",
    readyTitleRelay: "RU Relay is ready",
    readyHintRelay:
      "On mobile, import the xHTTP URL. TCP classic (:8443) is a Wi‑Fi fallback.",
    sniTip:
      "Using SNI: {sni}. If connection fails, try changing the SNI domain above and re-running setup.",
    relaySniTip:
      "Relay SNI: {sni}. To change the mask, replace the RU Relay and set another SNI in the dialog.",
    qrAlt: "VLESS QR code",
    relayQrAlt: "RU relay VLESS QR code",
    previousFailed: "Previous setup failed. You can retry installation.",
    serverNotFound: "Server not found",
    setupFailed: "Setup failed",
    diagnosticsTitle: "Installation diagnostics",
    diagnosticsDetectedIssue: "Likely issue",
    diagnosticsNextSteps: "What to do next",
    diagnosticsSignals: "Signals from logs",
    diagnosticsRawOutput: "Raw installer logs",
    diagnosticsHealthy: "Looks healthy",
    diagnosticsNeedsAttention: "Needs attention",
    diagIssueSshAuth: "SSH authentication problem",
    diagIssueSshNetwork: "SSH reachability problem",
    diagIssueSshKey: "Platform SSH key problem",
    diagIssuePortInUse: "Port conflict on the VPS",
    diagIssueRelayDependency: "Relay dependency is not ready",
    diagIssueInstallScript: "Remote install script failed",
    diagIssueParseConfig:
      "The server appears configured, but the app could not read the generated config",
    diagIssueUnknown: "The exact cause could not be determined automatically",
    diagStepCheckCredentials:
      "Check the SSH username, password, or private key configured for this server.",
    diagStepCheckIpPort:
      "Check the server IP, SSH port, security groups, and whether port 22/your SSH port is reachable.",
    diagStepCheckPublicKey:
      "If you use SSH key mode, re-copy the platform public key to the VPS and make sure it is present in the correct user's authorized_keys.",
    diagStepCheckPortConflict:
      "Free the conflicting port or change the VLESS port in the server settings, then retry setup.",
    diagStepCheckExitReady:
      "Finish the main exit-server setup first, then retry the relay installation.",
    diagStepRetrySetup: "After fixing the issue, retry the setup.",
    diagStepTryAnotherSni:
      "If SSH and installation succeed but connectivity is unstable afterwards, try a different SNI domain.",
    diagStepReviewRawOutput:
      "If the cause is still unclear, inspect the raw logs below and look for the first explicit error.",
    directUrl: "Direct VLESS URL (exit)",
    relayUrl: "Relay VLESS URL (via this RU hop)",
    relayUrlXhttp: "VLESS xHTTP (mobile, :443)",
    relayUrlTcp: "VLESS TCP classic (:8443)",
    relayTransportHint:
      "On LTE try xHTTP first. TCP classic is a Wi‑Fi fallback if your provider still allows TCP Reality.",
    reRun: "Re-run setup",
    backServers: "Back to servers",
    relayCardTitle: "RU Relay — Russian hop",
    relayCardHint:
      "Exit VPN must be ready first. Then add a RU VPS, install the relay, and import the “via RU relay” URL in your client — not the direct exit URL.",
    addRelay: "Add RU Relay",
    openRelay: "Open relay config",
    openRelaySetup: "Open relay setup",
    replaceRelay: "Replace / reinstall RU relay",
    replaceRelayHint:
      "Adding again replaces the current RU VPS: the old config is cleared and you must reinstall.",
    viaRelay: "Via RU relay — xHTTP (when direct is blocked)",
    viaRelayTcp: "Via RU relay — TCP classic (:8443)",
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
        "Cannot start setup: no SSH credentials. Edit the server and add a password, or add the platform public key on the VPS (SSH key mode).",
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
      "Enter your RU VPS — you’ll land on a setup page like a normal server. Abroad VPS server: {name}.",
    name: "Name",
    namePlaceholder: "RU Relay → {name}",
    ipv4: "RU VPS IPv4",
    sshPort: "SSH port",
    sshUsername: "SSH username",
    sshUsernameHint:
      "Default is root. For ubuntu/debian, passwordless sudo is required.",
    auth: "SSH auth",
    sshKey: "SSH key",
    password: "Password",
    authHint:
      "SSH key works only if this RU VPS already has the platform public key. Otherwise choose root password.",
    relaySni: "Relay SNI (client → RU)",
    relaySniHint:
      "Masks as a Russian site on :443. Prefer eh.vk.com; if unstable try max.ru or rutube.ru.",
    howItWorksTitle: "How it works (order)",
    howItWorksStep1: "Abroad VPN is already installed (this exit is ready).",
    howItWorksStep2:
      "Enter IP and SSH access for a VPS in Russia — no xHTTP/path fields to fill.",
    howItWorksStep3:
      "On the next page click “Install RU Relay” and wait until it succeeds.",
    howItWorksStep4:
      "In your client, import the relay QR/URL (or “via RU relay” on the exit) — not the direct exit VLESS.",
    howItWorksNote:
      "After install you get two URLs: xHTTP on :443 (for mobile) and TCP classic on :8443 (fallback). RU → exit transport is configured automatically.",
    continue: "Continue → Setup",
    installing: "Saving…",
    cancel: "Cancel",
    failed: "Failed to register RU relay",
  },
  cdn: {
    cardTitle: "Yandex CDN — bypass without a whitelist IP",
    cardHint:
      "Client → Yandex Cloud CDN → Origin → this Exit. You need a domain, a second Origin VPS, and a Yandex Cloud account.",
    openSetup: "Set up Yandex CDN",
    replaceSetup: "Reconfigure Yandex CDN",
    shopTitle: "What to buy / prepare",
    shopDomain:
      "A domain with DNS (records origin.*, relay.*, cdn.*):",
    shopExit:
      "Abroad exit VPS — you already have it (this page). Installer opens ports 80 and 11443.",
    shopOrigin:
      "Origin VPS with a public IP (separate server or your RU Relay VPS). Installer opens 80/443. Timeweb Cloud is the recommended purchase path here. Note: Origin puts Nginx on :443 — RU Relay on that same IP will be replaced.",
    shopYandex:
      "Yandex Cloud — Certificate Manager + Cloud CDN (Compute VM not required for CDN):",
    shopDns:
      "Create DNS first (see hints under the fields), wait for resolve, then run install.",
    title: "Yandex CDN",
    description:
      "We save settings and SSH-install Exit (:11443 TLS) + Origin (Nginx+Xray). You finish Certificate Manager + CDN in the Yandex console.",
    dnsBeforeInstallTitle: "DNS before server install",
    dnsBeforeInstallBody:
      "In your registrar DNS panel create the records below. Wrong DNS makes Let's Encrypt and install fail. CDN domain CNAME comes only after the Yandex Cloud CDN resource exists.",
    cdnDomain: "CDN domain (client)",
    cdnDomainDnsHint:
      "We recommend using a www host from the start, e.g. www.example.com. Do not create an A record yet. After CDN in Yandex: CNAME this name → the hostname from Cloud CDN (usually *.topology.gslb.yccdn.ru).",
    originDomain: "Origin domain",
    originDomainDnsHint:
      "Usually a separate subdomain, e.g. origin.example.com. Now: A record for this name → Origin VPS IPv4 (field below). Required before install — certificate + Yandex CDN origin.",
    relayDomain: "Relay domain (Exit TLS)",
    relayDomainDnsHint:
      "Usually a separate subdomain, e.g. relay.example.com. Now: A record for this name → this Exit IPv4 ({exitIp}). Required before install — Let's Encrypt on Exit for :11443.",
    email: "Email for Let's Encrypt",
    path: "XHTTP path",
    paddingKey: "Padding key",
    originIp: "Origin VPS IPv4",
    originIpDnsHint:
      "Origin domain A record must point here. You may use your RU Relay VPS IP — it becomes Origin (RU Relay on :443 is replaced).",
    originRoleWarning:
      "Origin installer overwrites Xray and takes :443 (Nginx). If this IP is your RU Relay, relay client URLs stop working; the path becomes Client → Yandex CDN → this Origin → Exit.",
    originSshPort: "Origin SSH port",
    originSshUser: "Origin SSH username",
    originSshPassword: "Origin SSH password",
    saveAndInstall: "Save and install on servers",
    installing: "Installing Exit + Origin…",
    cancel: "Cancel",
    failed: "Failed to configure Yandex CDN",
    readyTitle: "CDN servers are ready",
    readyHint:
      "The script installed Exit + Origin. Next: Certificate Manager, CDN resource, and CNAME — open “What to do next”.",
    clientUrl: "VLESS via Yandex CDN",
    whatNext: "What to do next",
    checklistTitle: "Short checklist",
    checklistDns: "1) DNS: A origin→Origin IP, A relay→Exit IP must already work.",
    checklistCert:
      "2) Certificate Manager → Let's Encrypt for the CDN domain (DNS challenge).",
    checklistCdn:
      "3) Cloud CDN → resource: origin=Origin domain, HTTPS, Host=Origin, no cache, methods GET/HEAD/OPTIONS.",
    checklistCname:
      "4) CNAME the CDN domain → hostname from the CDN panel (*.topology.gslb.yccdn.ru), HTTP→HTTPS.",
    checklistTest:
      "5) curl OPTIONS https://CDN-domain/cdn-check → 204 and X-CDN-Origin: ok, then import VLESS into v2rayNG.",
    docsCert: "Certificate Manager docs",
    docsCdn: "Cloud CDN docs",
    docsCreate: "Create CDN resource",
    nextSteps: {
      title: "What to do next after CDN install",
      intro:
        "The script already set up Exit (:11443) and Origin (Nginx+Xray). Finish Yandex Cloud and DNS for the client domain using the steps below. Use your values from “Your details”.",
      yourValuesTitle: "Your details (from setup form)",
      labelCdn: "CDN domain (client)",
      labelOrigin: "Origin domain",
      labelRelay: "Relay domain (Exit TLS)",
      labelOriginIp: "Origin IP",
      labelExitIp: "Exit IP",
      openConsole: "Open Yandex Cloud console",
      step1Title: "Certificate Manager — cert for the CDN domain",
      step1Body:
        "Open Yandex Cloud → Certificate Manager → create a Let's Encrypt certificate.",
      step1Item1:
        "Certificate domain(s): exactly {cdnDomain} (if you use www, add www.{cdnDomain} or make www the client hostname).",
      step1Item2:
        "Challenge type: DNS. Create the CNAME _acme-challenge (as shown by Yandex) at the registrar for zone {cdnDomain}. Do not confuse it with the CDN traffic CNAME.",
      step1Item3:
        "Wait until status is Issued. Keep the _acme-challenge record for renewal.",
      step2Title: "Cloud CDN — create a resource",
      step2Body: "Cloud CDN → create resource. Fill fields exactly like this:",
      step2Origin: "Origin hostname",
      step2Protocol: "Origin protocol",
      step2Host: "Host header (custom)",
      step2Domain: "Personal / client domain",
      step2Cert: "Certificate",
      step2CertValue: "the one issued for {cdnDomain}",
      step2Extra:
        "Disable request redirects to origin and “follow origin redirects”. End-user access: allowed.",
      step3Title: "Caching and content",
      step3Item1: "CDN caching — off.",
      step3Item2: "Browser caching — off.",
      step3Item3: "gzip — do not compress.",
      step3Item4: "Large file segmentation — off.",
      step4Title: "HTTP methods",
      step4Item1:
        "Allowed methods: GET, HEAD, OPTIONS (POST is often unavailable in Yandex CDN — that is expected).",
      step4Item2: "CORS — Do not add. Custom HTTP response — off.",
      step5Title: "DNS CNAME for the client domain",
      step5Body:
        "In the CDN resource card copy the CNAME target (often *.topology.gslb.yccdn.ru).",
      step5Item1:
        "At your registrar, for {cdnDomain} (often host www or @) create CNAME → the Yandex value.",
      step5Item2:
        "If the registrar blocks apex CNAME, use www.{cdnDomain}: certificate and CDN personal domain must be www too.",
      step5Item3:
        "In CDN: client redirect HTTP→HTTPS. Do not delete _acme-challenge.",
      step6Title: "Verification",
      step6Body: "From your PC (disable AV DNS filters if needed):",
      step6Cmd:
        "curl -sI -X OPTIONS \"https://{cdnDomain}/cdn-check\"",
      step6Expect:
        "Expect HTTP 204 and X-CDN-Origin: ok. Certificate must be for {cdnDomain}, not *.yccdn.cloud.yandex.net.",
      step7Title: "Client — import VLESS",
      step7Body:
        "Copy the VLESS URL / QR from this page (after the steps above). Recommended clients with xHTTP packet-up + extra:",
      step7Item1: "Android: v2rayNG (latest APK from GitHub Releases).",
      step7Item2: "Windows: v2rayN (latest release, Xray core ≥ 26.5.9).",
      step7Item3:
        "Import the link as-is — do not strip the extra parameter (padding for Yandex CDN).",
      step7Warning:
        "Hiddify and some older clients often break padding (Origin logs show x_padding=XXXX) — Yandex CDN will time out. Use v2rayNG / v2rayN.",
      clientAndroid: "v2rayNG (Android)",
      clientWindows: "v2rayN (Windows)",
      tipsTitle: "If it does not connect",
      tip1:
        "Check DNS: dig/nslookup {cdnDomain} must point to CDN, not the Origin IP.",
      tip2:
        "Temporarily disable antivirus/DNS filter — it can break CDN domain resolution.",
      tip3:
        "A direct Origin URL may work while CDN fails: first get 204 on /cdn-check via the CDN domain.",
    },
  },
};
