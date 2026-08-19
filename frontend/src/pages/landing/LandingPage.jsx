import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, stroke = true, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={stroke ? "none" : "currentColor"}
    stroke={stroke ? "currentColor" : "none"}
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {Array.isArray(d) ? (
      d.map((p, i) => <path key={i} d={p} />)
    ) : (
      <path d={d} />
    )}
  </svg>
);

const MenuIcon = () => (
  <Icon d={["M3 12h18", "M3 6h18", "M3 18h18"]} size={22} />
);

const CloseIcon = () => <Icon d={["M18 6L6 18", "M6 6l12 12"]} size={22} />;

const ShieldIcon = () => (
  <Icon d="M12 2l7 4v6c0 5-3.5 9.74-7 11-3.5-1.26-7-6-7-11V6l7-4z" size={22} />
);

const UsersIcon = () => (
  <Icon
    d={[
      "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2",
      "M23 21v-2a4 4 0 0 0-3-3.87",
      "M16 3.13a4 4 0 0 1 0 7.75",
    ]}
    size={22}
  >
    <circle
      cx="9"
      cy="7"
      r="4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    />
  </Icon>
);

const FileTextIcon = () => (
  <Icon size={22}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline
      points="14 2 14 8 20 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    <line
      x1="16"
      y1="13"
      x2="8"
      y2="13"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="17"
      x2="8"
      y2="17"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <line
      x1="10"
      y1="9"
      x2="8"
      y2="9"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </Icon>
);

const BarChartIcon = () => (
  <Icon size={22}>
    <line
      x1="18"
      y1="20"
      x2="18"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="20"
      x2="12"
      y2="4"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <line
      x1="6"
      y1="20"
      x2="6"
      y2="14"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <line
      x1="2"
      y1="20"
      x2="22"
      y2="20"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </Icon>
);

const CarIcon = () => (
  <Icon size={22}>
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
    <circle
      cx="7"
      cy="17"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    />
    <circle
      cx="17"
      cy="17"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    />
  </Icon>
);

const MapPinIcon = () => (
  <Icon size={20} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z">
    <circle
      cx="12"
      cy="10"
      r="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    />
  </Icon>
);

const PhoneIcon = () => (
  <Icon
    size={20}
    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.47 2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.88a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
  />
);

const MailIcon = () => (
  <Icon size={20}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline
      points="22,6 12,13 2,6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
  </Icon>
);

const CheckCircleIcon = () => (
  <Icon size={28} d="M22 11.08V12a10 10 0 1 1-5.93-9.14">
    <polyline
      points="22 4 12 14.01 9 11.01"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
  </Icon>
);

const UserPlusIcon = () => (
  <Icon size={28}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle
      cx="8.5"
      cy="7"
      r="4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    />
    <line
      x1="20"
      y1="8"
      x2="20"
      y2="14"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <line
      x1="23"
      y1="11"
      x2="17"
      y2="11"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </Icon>
);

const LayoutIcon = () => (
  <Icon size={28}>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      ry="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    />
    <line
      x1="3"
      y1="9"
      x2="21"
      y2="9"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <line
      x1="9"
      y1="21"
      x2="9"
      y2="9"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </Icon>
);

const EyeIcon = () => (
  <Icon size={20} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z">
    <circle
      cx="12"
      cy="12"
      r="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    />
  </Icon>
);

const ScaleIcon = () => (
  <Icon size={20}>
    <line
      x1="12"
      y1="3"
      x2="12"
      y2="21"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <path d="M5 6l7-3 7 3" />
    <path d="M5 18H2l3-9 3 9H5zM19 18h-3l3-9 3 9h-3z" />
  </Icon>
);

const SendIcon = () => (
  <Icon size={16} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
);

const FacebookIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" />
  </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────
const SERVICES = [
  {
    icon: <UsersIcon />,
    title: "Enforcer Management",
    desc: "Manage enforcer profiles, track assignments, and monitor field activity in real time.",
  },
  {
    icon: <CarIcon />,
    title: "Motorist Records",
    desc: "Maintain complete motorist profiles with full citation and violation history.",
  },
  {
    icon: <FileTextIcon />,
    title: "Citation Issuance",
    desc: "Issue digital citations on-site for faster processing and accurate record-keeping.",
  },
  {
    icon: <BarChartIcon />,
    title: "Reports & Monitoring",
    desc: "Access real-time dashboards and analytics for data-driven traffic enforcement.",
  },
];

const STEPS = [
  {
    icon: <UserPlusIcon />,
    title: "Register an Account",
    desc: "Sign up as a Motorist or Enforcer. Provide your details to create your profile in the system.",
  },
  {
    icon: <CheckCircleIcon />,
    title: "Verify via Email",
    desc: "Confirm your account using the verification link sent to your registered email address.",
  },
  {
    icon: <LayoutIcon />,
    title: "Access Your Dashboard",
    desc: "Log in to your role-based dashboard and access all services available to your account.",
  },
];

const PILLARS = [
  {
    icon: <EyeIcon />,
    title: "Transparency",
    sub: "All actions and citations are logged and auditable, ensuring clear accountability.",
  },
  {
    icon: <ScaleIcon />,
    title: "Accountability",
    sub: "Role-based access ensures every user is responsible only for their designated functions.",
  },
  {
    icon: <ShieldIcon />,
    title: "Public Service",
    sub: "Designed to serve the residents of San Jose, Occidental Mindoro safely and efficiently.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", message: "" });

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleContact = (e) => {
    e.preventDefault();
    setContact({ name: "", email: "", message: "" });
  };

  return (
    <div>
      {/* ── Navbar ────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav__inner">
          {/* Logo */}
          <a
            href="#home"
            className="lp-nav__logo"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("home");
            }}
          >
            <div className="lp-nav__logo-mark">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5a7 7 0 0 1 14 0" />
                <path d="M8.5 15.5a4 4 0 0 1 7 0" />
                <circle cx="12" cy="18.5" r="1.2" fill="#fff" stroke="none" />
              </svg>
            </div>
            <div className="lp-nav__logo-text">
              <span className="lp-nav__logo-name">SJTMO</span>
              <span className="lp-nav__logo-sub">
                San Jose Traffic Mgmt. Office
              </span>
            </div>
          </a>

          {/* Desktop Links */}
          <ul className="lp-nav__links">
            {[
              ["home", "Home"],
              ["services", "Services"],
              ["how-it-works", "How It Works"],
              ["about", "About"],
              ["contact", "Contact"],
            ].map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(id);
                  }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop Actions */}
          <div className="lp-nav__actions">
            <button
              className="lp-btn lp-btn--outline"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
            <button
              className="lp-btn lp-btn--primary"
              onClick={() => navigate("/register")}
            >
              Get Started
            </button>
          </div>

          {/* Hamburger */}
          <button
            className="lp-nav__hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`lp-nav__mobile ${menuOpen ? "open" : ""}`}>
          {[
            ["home", "Home"],
            ["services", "Services"],
            ["how-it-works", "How It Works"],
            ["about", "About"],
            ["contact", "Contact"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(id);
              }}
            >
              {label}
            </a>
          ))}
          <div className="lp-nav__mobile-actions">
            <button
              className="lp-btn lp-btn--outline"
              onClick={() => {
                setMenuOpen(false);
                navigate("/login");
              }}
            >
              Sign In
            </button>
            <button
              className="lp-btn lp-btn--primary"
              onClick={() => {
                setMenuOpen(false);
                navigate("/register");
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section id="home" className="lp-hero">
        <div className="lp-hero__inner">
          <div>
            <div className="lp-hero__badge">
              <span className="lp-hero__badge-dot" />
              Official Government System — San Jose, Occ. Mindoro
            </div>
            <h1 className="lp-hero__title">
              Efficient Traffic Management
              <br />
              <span>for a Safer San Jose</span>
            </h1>
            <p className="lp-hero__sub">
              A unified digital platform for citation issuance, enforcer
              coordination, and motorist services — making road safety faster,
              smarter, and more transparent.
            </p>
            <div className="lp-hero__cta">
              <button
                className="lp-btn lp-btn--hero-primary"
                onClick={() => navigate("/login")}
              >
                Sign In to Portal
              </button>
              <button
                className="lp-btn lp-btn--hero-ghost"
                onClick={() => scrollTo("services")}
              >
                Explore Services
              </button>
            </div>
            <div className="lp-hero__stats">
              <div>
                <div className="lp-hero__stat-value">3</div>
                <div className="lp-hero__stat-label">User Roles</div>
              </div>
              <div>
                <div className="lp-hero__stat-value">24/7</div>
                <div className="lp-hero__stat-label">System Access</div>
              </div>
              <div>
                <div className="lp-hero__stat-value">100%</div>
                <div className="lp-hero__stat-label">Digital Records</div>
              </div>
            </div>
          </div>

          {/* Abstract Dashboard Preview */}
          <div className="lp-hero__visual">
            <div className="lp-hero__graphic">
              <div className="lp-hero__graphic-header">
                <span
                  className="lp-hero__graphic-dot"
                  style={{ background: "#ff5f56" }}
                />
                <span
                  className="lp-hero__graphic-dot"
                  style={{ background: "#ffbd2e" }}
                />
                <span
                  className="lp-hero__graphic-dot"
                  style={{ background: "#27c93f" }}
                />
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 600,
                  }}
                >
                  SJTMO Dashboard
                </span>
              </div>
              {[
                {
                  icon: "🚦",
                  label: "Active Violations",
                  val: "View all pending cases",
                  badge: "Live",
                  badgeClass: "badge-green",
                },
                {
                  icon: "👮",
                  label: "Enforcer on Duty",
                  val: "Manage assignments",
                  badge: "Online",
                  badgeClass: "badge-blue",
                },
                {
                  icon: "📋",
                  label: "Citation Issued",
                  val: "Digital record updated",
                  badge: "New",
                  badgeClass: "badge-yellow",
                },
                {
                  icon: "📊",
                  label: "Monthly Report",
                  val: "Analytics & insights",
                  badge: "Ready",
                  badgeClass: "badge-green",
                },
              ].map(({ icon, label, val, badge, badgeClass }) => (
                <div className="lp-hero__graphic-row" key={label}>
                  <div className="lp-hero__graphic-icon">{icon}</div>
                  <div className="lp-hero__graphic-info">
                    <div className="lp-hero__graphic-label">{label}</div>
                    <div className="lp-hero__graphic-val">{val}</div>
                  </div>
                  <span className={`lp-hero__graphic-badge ${badgeClass}`}>
                    {badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────────── */}
      <section id="services" className="lp-section">
        <div className="lp-section__inner">
          <div className="lp-section__header">
            <span className="lp-section__eyebrow">Core Services</span>
            <h2 className="lp-section__title">
              Everything You Need, In One Platform
            </h2>
            <p className="lp-section__desc">
              From digital citation issuance to real-time analytics, SJTMO
              covers the full lifecycle of traffic enforcement and management.
            </p>
          </div>
          <div className="lp-services__grid">
            {SERVICES.map(({ icon, title, desc }) => (
              <div className="lp-service-card" key={title}>
                <div className="lp-service-card__icon">{icon}</div>
                <div className="lp-service-card__title">{title}</div>
                <p className="lp-service-card__desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section id="how-it-works" className="lp-section lp-section--alt">
        <div className="lp-section__inner">
          <div className="lp-section__header">
            <span className="lp-section__eyebrow">How It Works</span>
            <h2 className="lp-section__title">
              Get Started in Three Simple Steps
            </h2>
            <p className="lp-section__desc">
              Accessing the SJTMO system is quick and straightforward for all
              user types.
            </p>
          </div>
          <div className="lp-steps">
            {STEPS.map(({ icon, title, desc }, i) => (
              <div className="lp-step" key={title}>
                <div className="lp-step__num">
                  <div className="lp-step__icon-wrap">{icon}</div>
                </div>
                <div>
                  <div className="lp-step__title">
                    Step {i + 1} — {title}
                  </div>
                  <p className="lp-step__desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────────── */}
      <section id="about" className="lp-section">
        <div className="lp-section__inner">
          <div className="lp-about__inner">
            <div>
              <span className="lp-about__eyebrow">About SJTMO</span>
              <h2 className="lp-about__title">
                Serving San Jose Through Better Traffic Governance
              </h2>
              <p className="lp-about__body">
                The San Jose Traffic Management Office System (SJTMO) is an
                official digital platform developed to modernize traffic
                enforcement and management operations in San Jose, Occidental
                Mindoro. Our mission is to improve road safety, streamline
                citation processes, and provide transparent, accountable public
                service.
              </p>
              <div className="lp-about__pillars">
                {PILLARS.map(({ icon, title, sub }) => (
                  <div className="lp-about__pillar" key={title}>
                    <div className="lp-about__pillar-icon">{icon}</div>
                    <div>
                      <div className="lp-about__pillar-title">{title}</div>
                      <div className="lp-about__pillar-sub">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-about__visual">
              <div className="lp-about__card">
                <div className="lp-about__card-title">Our Mission</div>
                <div className="lp-about__card-sub">
                  To provide an efficient, transparent, and accountable traffic
                  management system that promotes road safety and serves the
                  public interest of San Jose, Occidental Mindoro through the
                  use of modern technology.
                </div>
              </div>
              <div className="lp-about__mini-cards">
                {[
                  { val: "3", label: "User Roles Supported" },
                  { val: "24/7", label: "System Availability" },
                  { val: "100%", label: "Digital Records" },
                  { val: "LGU", label: "Government Backed" },
                ].map(({ val, label }) => (
                  <div className="lp-about__mini" key={label}>
                    <div className="lp-about__mini-val">{val}</div>
                    <div className="lp-about__mini-label">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────────── */}
      <section id="contact" className="lp-section lp-section--alt">
        <div className="lp-section__inner">
          <div className="lp-section__header">
            <span className="lp-section__eyebrow">Contact Us</span>
            <h2 className="lp-section__title">Get In Touch</h2>
            <p className="lp-section__desc">
              Have questions or need assistance? Reach out to the SJTMO office.
            </p>
          </div>
          <div className="lp-contact__grid">
            <div className="lp-contact__info">
              {[
                {
                  icon: <MapPinIcon />,
                  label: "Office Address",
                  value:
                    "Municipal Hall, San Jose, Occidental Mindoro, Philippines",
                },
                {
                  icon: <PhoneIcon />,
                  label: "Phone Number",
                  value: "+63 (043) 123-4567",
                },
                {
                  icon: <MailIcon />,
                  label: "Email Address",
                  value: "traffic@sanjose.gov.ph",
                },
              ].map(({ icon, label, value }) => (
                <div className="lp-contact__item" key={label}>
                  <div className="lp-contact__item-icon">{icon}</div>
                  <div>
                    <div className="lp-contact__item-label">{label}</div>
                    <div className="lp-contact__item-value">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lp-contact__form-card">
              <div className="lp-contact__form-title">Send a Message</div>
              <form onSubmit={handleContact} noValidate>
                <div className="lp-form-group">
                  <label className="lp-form-label" htmlFor="c-name">
                    Full Name
                  </label>
                  <input
                    id="c-name"
                    className="lp-form-input"
                    placeholder="Your full name"
                    value={contact.name}
                    onChange={(e) =>
                      setContact({ ...contact, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="lp-form-group">
                  <label className="lp-form-label" htmlFor="c-email">
                    Email Address
                  </label>
                  <input
                    id="c-email"
                    className="lp-form-input"
                    type="email"
                    placeholder="your@email.com"
                    value={contact.email}
                    onChange={(e) =>
                      setContact({ ...contact, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="lp-form-group">
                  <label className="lp-form-label" htmlFor="c-msg">
                    Message
                  </label>
                  <textarea
                    id="c-msg"
                    className="lp-form-textarea"
                    placeholder="Write your message here…"
                    value={contact.message}
                    onChange={(e) =>
                      setContact({ ...contact, message: e.target.value })
                    }
                    required
                  />
                </div>
                <button className="lp-btn lp-btn--send" type="submit">
                  <SendIcon />
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer__top">
          {/* Brand */}
          <div>
            <div className="lp-footer__brand-name">SJTMO</div>
            <div className="lp-footer__brand-sub">
              San Jose Traffic Management Office
            </div>
            <p className="lp-footer__brand-desc">
              An official digital platform of the local government of San Jose,
              Occidental Mindoro, dedicated to improving road safety and traffic
              enforcement.
            </p>
            <div className="lp-footer__socials">
              <a href="#!" className="lp-footer__social" aria-label="Facebook">
                <FacebookIcon />
              </a>
              <a href="#!" className="lp-footer__social" aria-label="Twitter">
                <TwitterIcon />
              </a>
              <a href="#!" className="lp-footer__social" aria-label="YouTube">
                <YoutubeIcon />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <div className="lp-footer__col-title">Navigation</div>
            <ul className="lp-footer__col-links">
              {[
                ["home", "Home"],
                ["services", "Services"],
                ["how-it-works", "How It Works"],
                ["about", "About"],
                ["contact", "Contact"],
              ].map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(id);
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <div className="lp-footer__col-title">Services</div>
            <ul className="lp-footer__col-links">
              {[
                "Enforcer Management",
                "Motorist Records",
                "Citation Issuance",
                "Reports & Monitoring",
              ].map((s) => (
                <li key={s}>
                  <a
                    href="#services"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo("services");
                    }}
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="lp-footer__col-title">Legal</div>
            <ul className="lp-footer__col-links">
              <li>
                <a href="#!">Privacy Policy</a>
              </li>
              <li>
                <a href="#!">Terms of Service</a>
              </li>
              <li>
                <a href="#!">Data Protection</a>
              </li>
              <li>
                <a href="#!">Accessibility</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <div className="lp-footer__bottom-inner">
            <p className="lp-footer__disclaimer">
              © {new Date().getFullYear()} San Jose Traffic Management Office —
              Local Government of San Jose, Occidental Mindoro. Official
              government system. All rights reserved.
            </p>
            <div className="lp-footer__bottom-links">
              <a href="#!">Privacy Policy</a>
              <a href="#!">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
