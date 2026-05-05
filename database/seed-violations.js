/**
 * Seeds exactly 100 violations for San Jose, Occidental Mindoro.
 * Deletes ALL existing violations before inserting.
 *
 * Usage (from project root):
 *   node database/seed-violations.js
 *
 * Requires backend/.env to be configured.
 */

require("dotenv").config({
  path: require("path").join(__dirname, "../backend/.env"),
});

const { Pool } = require("pg");

const isRemote =
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes("localhost") &&
  !process.env.DATABASE_URL.includes("127.0.0.1");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "sjtmo_db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
    });

// ── Exact coordinates provided ───────────────────────────────
const COORDS = [
  [12.351812, 121.064912],[12.350998, 121.063745],[12.352104, 121.065331],
  [12.350765, 121.064102],[12.351554, 121.063998],[12.352221, 121.064887],
  [12.350932, 121.065104],[12.351678, 121.063512],[12.352445, 121.064201],
  [12.350843, 121.064678],[12.354612, 121.067812],[12.353998, 121.066945],
  [12.354889, 121.067233],[12.353776, 121.067998],[12.354501, 121.066732],
  [12.355102, 121.067521],[12.353945, 121.068201],[12.354712, 121.066889],
  [12.355001, 121.067998],[12.353821, 121.067102],[12.355912, 121.060998],
  [12.354998, 121.061402],[12.355732, 121.059998],[12.356001, 121.060543],
  [12.354876, 121.060211],[12.355654, 121.061223],[12.356112, 121.060998],
  [12.355203, 121.059887],[12.355889, 121.060345],[12.354932, 121.060998],
  [12.358412, 121.045998],[12.357998, 121.046821],[12.358901, 121.047102],
  [12.357776, 121.046201],[12.358554, 121.045732],[12.359001, 121.046998],
  [12.357889, 121.046543],[12.358712, 121.045998],[12.359102, 121.046321],
  [12.357945, 121.047002],[12.353712, 121.062998],[12.352998, 121.062201],
  [12.353889, 121.063102],[12.352776, 121.062998],[12.353554, 121.061998],
  [12.353001, 121.062543],[12.352889, 121.063201],[12.353712, 121.062345],
  [12.353998, 121.062889],[12.352945, 121.062678],[12.380102, 121.050998],
  [12.379998, 121.049998],[12.379445, 121.050732],[12.380554, 121.051201],
  [12.379998, 121.050543],[12.380221, 121.049887],[12.379712, 121.050998],
  [12.380445, 121.050321],[12.379998, 121.051102],[12.380112, 121.050678],
  [12.376201, 121.055998],[12.375998, 121.054998],[12.375445, 121.055732],
  [12.376554, 121.056201],[12.375998, 121.055543],[12.376221, 121.054887],
  [12.375712, 121.055998],[12.376445, 121.055321],[12.375998, 121.056102],
  [12.376112, 121.055678],[12.353201, 121.062998],[12.352998, 121.061998],
  [12.352445, 121.062732],[12.353554, 121.063201],[12.352998, 121.062543],
  [12.353221, 121.061887],[12.352712, 121.062998],[12.353445, 121.062321],
  [12.352998, 121.063102],[12.353112, 121.062678],[12.351998, 121.064543],
  [12.351445, 121.063998],[12.352554, 121.065201],[12.350998, 121.064998],
  [12.351221, 121.063887],[12.352712, 121.064998],[12.351998, 121.065102],
  [12.352445, 121.064321],[12.351112, 121.064678],[12.350998, 121.063998],
  [12.354998, 121.067102],[12.353445, 121.066998],[12.355554, 121.068201],
  [12.354998, 121.067543],[12.354221, 121.066887],[12.353712, 121.067998],
  [12.355998, 121.067102],[12.354445, 121.067321],[12.353998, 121.068102],
  [12.355112, 121.067678],
];

// ── Data pools ───────────────────────────────────────────────
const FIRST_NAMES = [
  "Juan","Pedro","Jose","Carlos","Miguel","Antonio","Ramon","Eduardo",
  "Roberto","Francisco","Manuel","Ricardo","Fernando","Armando","Danilo",
  "Renato","Rolando","Gilbert","Ernesto","Alejandro","Domingo","Arturo",
  "Rodrigo","Nestor","Bernardo","Alfredo","Victorino","Mariano","Eugenio",
  "Teodoro","Leandro","Celestino","Florentino","Cornelio","Herminio",
  "Maria","Ana","Rosa","Elena","Lourdes","Marilou","Cristina","Teresita",
  "Marilyn","Rowena","Gemma","Sheila","Jocelyn","Leonora","Remedios",
  "Evelyn","Corazon","Felicidad","Ligaya","Perla","Zenaida",
  "Mark","John","Ryan","Kevin","Renz","Jayson","Alvin","Arjay","Rommel",
  "Jomar","Jerick","Aldrin","Noel","Sherwin","Raymund","Dennis","Rodel",
  "Marvin","Wilfredo","Simplicio","Diosdado","Crisanto",
];

const LAST_NAMES = [
  "Santos","Reyes","Cruz","Garcia","Ramos","Flores","Mendoza","Torres",
  "Villanueva","Gonzales","Bautista","Castillo","Aquino","Dela Cruz",
  "Manalo","Hernandez","Dela Torre","Ocampo","Pascual","Soriano","Aguilar",
  "Concepcion","Ferrer","Navarro","Gutierrez","Espiritu","Tolentino",
  "Macapagal","Silverio","Policarpio","Macaraeg","Dimaculangan","Baluyot",
  "Paglinawan","Kabigting","Mateo","Bartolome","Magpantay","Salazar",
  "Bagamasbad","Tiongson","Pineda","Tayag","Buenaventura","Galang",
  "Lingad","Yumul","Mandap","Lacap","Pangilinan","Sison","Beltran",
  "Evangelista","Mercado","Malit","Dungca","Panlilio","Mallari","Tinio",
];

const REPEAT_OFFENDERS = [
  "Ramon Flores","Pedro Santos","Juan dela Cruz","Carlos Reyes",
  "Miguel Torres","Antonio Bautista","Roberto Manalo","Jose Garcia",
  "Mark Villanueva","Ryan Cruz","Marvin Mendoza","Renz Aquino",
];

const ENFORCERS = [
  "Enforcer Juan","Enforcer Marco","Enforcer Lito","Enforcer Dante",
  "Enforcer Bert","Enforcer Ricky","Enforcer Tony",
];

const VIOLATION_TYPES = [
  "No Helmet","Illegal Parking","No License",
  "Reckless Driving","Beating Red Light","Obstruction",
];

const MULTI_VIOLATIONS = [
  "No Helmet, No License",
  "Reckless Driving, No Helmet",
  "Illegal Parking, Obstruction",
  "No License, Beating Red Light",
];

const NOTES = {
  "No Helmet": [
    "Motorist apprehended riding without helmet.",
    "No helmet worn. First offense.",
    "Rider and back rider both without helmets.",
    "Helmet not strapped properly, considered as no helmet.",
    "Habal-habal driver without helmet.",
  ],
  "Illegal Parking": [
    "Vehicle parked on no-parking zone.",
    "Obstructing traffic flow due to illegal parking.",
    "Parked in front of fire hydrant.",
    "Double-parking reported.",
    "Vehicle left unattended in no-parking area.",
  ],
  "No License": [
    "Driver failed to produce license when flagged down.",
    "No valid driver's license presented at checkpoint.",
    "Expired license presented. Treated as no license.",
    "Student permit only — driving without supervisor.",
    "Driving without license after prior confiscation.",
  ],
  "Reckless Driving": [
    "Weaving through traffic recklessly.",
    "Overspeeding and swerving.",
    "Cutting lanes and overtaking unsafely.",
    "Motorist ran past stop line and ignored enforcer signal.",
    "Reported near-collision due to reckless driving.",
  ],
  "Beating Red Light": [
    "Ran red light at intersection.",
    "Motorist ignored red signal.",
    "Traffic light violation observed. No stopping.",
    "Beating red light during peak hours.",
    "Witnessed running red light — no hesitation.",
  ],
  "Obstruction": [
    "Vehicle causing road obstruction.",
    "Loading/unloading in prohibited area.",
    "Tricycle loading passengers in the middle of the road.",
    "Illegal vending blocking traffic flow.",
    "Motorcycle parked on sidewalk causing pedestrian obstruction.",
  ],
};

const STATUSES = ["pending","pending","pending","paid","resolved","dismissed","disputed"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomDate() {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * 730));
  d.setHours(6 + Math.floor(Math.random() * 14));
  d.setMinutes(Math.floor(Math.random() * 60));
  return d.toISOString();
}

function buildNote(vt) {
  const primaryType = vt.split(",")[0].trim();
  const templates = NOTES[primaryType] || ["Violation recorded."];
  return pick(templates);
}

// ── Main ─────────────────────────────────────────────────────
async function seedViolations() {
  const target = process.env.DATABASE_URL
    ? isRemote ? "remote (Render)" : "local (DATABASE_URL)"
    : `local (${process.env.DB_NAME || "sjtmo_db"})`;

  console.log(`\n── Seeding violations on ${target} ─────────────────\n`);

  // Delete ALL existing violations
  const { rowCount } = await pool.query("DELETE FROM violations");
  console.log(`  ✓ Deleted ${rowCount} existing violations\n`);

  // Reset ticket sequence so numbers start clean
  await pool.query("ALTER SEQUENCE ticket_seq RESTART WITH 1");

  // Build 100 records — one per coordinate
  // First 15 coords assigned to repeat offenders, rest are unique motorists
  const records = COORDS.map(([lat, lng], i) => {
    const isRepeat = i < 15;
    const isMulti  = i % 10 === 9; // every 10th ticket is a multi-violation
    const name     = isRepeat ? pick(REPEAT_OFFENDERS) : randomName();
    const vt       = isMulti ? pick(MULTI_VIOLATIONS) : pick(VIOLATION_TYPES);
    return {
      motorist_name:  name,
      violation_type: vt,
      notes:          buildNote(vt),
      latitude:       lat,
      longitude:      lng,
      enforcer_name:  pick(ENFORCERS),
      status:         pick(STATUSES),
      date_issued:    randomDate(),
    };
  });

  // Shuffle so repeat offenders aren't bunched at the top
  records.sort(() => Math.random() - 0.5);

  let inserted = 0;
  for (const r of records) {
    await pool.query(
      `INSERT INTO violations
         (motorist_name, violation_type, notes, latitude, longitude, enforcer_name, status, date_issued)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [r.motorist_name, r.violation_type, r.notes,
       r.latitude, r.longitude, r.enforcer_name, r.status, r.date_issued],
    );
    inserted++;
  }

  console.log(`  ✓ ${inserted} violations inserted.\n`);

  const stats = await pool.query(
    "SELECT status, COUNT(*) FROM violations GROUP BY status ORDER BY COUNT(*) DESC",
  );
  console.log("── Status breakdown ────────────────────────────────");
  stats.rows.forEach(r => console.log(`  ${r.status.padEnd(12)} ${r.count}`));

  const top = await pool.query(
    `SELECT motorist_name, COUNT(*) AS tickets FROM violations
     GROUP BY motorist_name ORDER BY tickets DESC LIMIT 5`,
  );
  console.log("\n── Top repeat offenders ────────────────────────────");
  top.rows.forEach(r =>
    console.log(`  ${r.motorist_name.padEnd(28)} ${r.tickets} tickets`),
  );
  console.log();

  await pool.end();
}

seedViolations().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
