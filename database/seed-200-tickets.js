/**
 * Seeds exactly 200 tickets across 4 specific coordinates and 3 consecutive months (June-August 2026)
 * Also creates motorist and vehicle records for each ticket
 *
 * Usage (from project root):
 *   node database/seed-200-tickets.js
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

// ── Four specific coordinates (with scatter within ~0.005 degrees) ───
const LOCATION_CLUSTERS = [
  { lat: 12.351368, lng: 121.064309, name: "Poblacion Central" },
  { lat: 12.354079, lng: 121.067437, name: "Rizal Avenue" },
  { lat: 12.357494, lng: 121.073009, name: "National Highway" },
  { lat: 12.358226, lng: 121.045351, name: "Terminal Area" },
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
  { first: "Ramon", last: "Flores" },
  { first: "Pedro", last: "Santos" },
  { first: "Juan", last: "dela Cruz" },
  { first: "Carlos", last: "Reyes" },
  { first: "Miguel", last: "Torres" },
  { first: "Antonio", last: "Bautista" },
  { first: "Roberto", last: "Manalo" },
  { first: "Jose", last: "Garcia" },
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

const VEHICLE_TYPES = ["motorcycle", "car", "tricycle", "jeepney"];

const PLATE_PREFIXES = [
  "NAR","NAX","NAW","NAV","NAU","NAS","NAR","ABG","ACE","ACF","ACD",
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

const STATUSES = ["pending","pending","pending","pending","paid","resolved","dismissed","disputed"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName() {
  return { first: pick(FIRST_NAMES), last: pick(LAST_NAMES) };
}

// Generate date within June-August 2026
function randomDateInRange() {
  const start = new Date(2026, 5, 1); // June 1, 2026
  const end = new Date(2026, 8, 1);  // Sept 1, 2026
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  date.setHours(6 + Math.floor(Math.random() * 14));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date.toISOString();
}

function buildNote(vt) {
  const primaryType = vt.split(",")[0].trim();
  const templates = NOTES[primaryType] || ["Violation recorded."];
  return pick(templates);
}

function scatterCoordinate(cluster) {
  const scatter = 0.003; // ~300 meters
  return {
    latitude: cluster.lat + (Math.random() - 0.5) * scatter,
    longitude: cluster.lng + (Math.random() - 0.5) * scatter,
  };
}

function generatePlateNo() {
  const prefix = pick(PLATE_PREFIXES);
  const numbers = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${prefix} ${numbers}`;
}

// ── Main ─────────────────────────────────────────────────────
async function seedTickets() {
  const target = process.env.DATABASE_URL
    ? isRemote ? "remote (Render)" : "local (DATABASE_URL)"
    : `local (${process.env.DB_NAME || "sjtmo_db"})`;

  console.log(`\n── Seeding 200 tickets on ${target} ─────────────────\n`);

  const client = await pool.connect();
  let motoristsCreated = 0;
  let vehiclesCreated = 0;
  let ticketsCreated = 0;

  try {
    // Delete existing data to start fresh (payments first due to FK constraint)
    await client.query("BEGIN");
    const { rowCount: deletedPayments } = await client.query("DELETE FROM payments");
    const { rowCount: deletedTickets } = await client.query("DELETE FROM tickets");
    const { rowCount: deletedVehicles } = await client.query("DELETE FROM vehicles");
    const { rowCount: deletedMotorists } = await client.query("DELETE FROM motorists");
    console.log(`  ✓ Cleaned: ${deletedPayments} payments, ${deletedTickets} tickets, ${deletedVehicles} vehicles, ${deletedMotorists} motorists\n`);

    // Reset sequences
    await client.query("ALTER SEQUENCE ticket_seq RESTART WITH 1");

    // Build 200 records
    for (let i = 0; i < 200; i++) {
      const isRepeat = i % 25 === 0; // Every 25th is a repeat offender
      const isMulti = i % 13 === 12; // Every 13th is multi-violation
      const nameObj = isRepeat
        ? pick(REPEAT_OFFENDERS)
        : randomName();

      const vt = isMulti ? pick(MULTI_VIOLATIONS) : pick(VIOLATION_TYPES);
      const cluster = pick(LOCATION_CLUSTERS);
      const coords = scatterCoordinate(cluster);
      const plateNo = generatePlateNo();
      const vehicleType = pick(VEHICLE_TYPES);

      // Insert motorist
      const motoristResult = await client.query(
        `INSERT INTO motorists (first_name, last_name, contact_no)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [nameObj.first, nameObj.last, `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`],
      );
      const motoristId = motoristResult.rows[0].id;
      motoristsCreated++;

      // Insert vehicle
      const vehicleResult = await client.query(
        `INSERT INTO vehicles (motorist_id, plate_no, vehicle_type)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [motoristId, plateNo, vehicleType],
      );
      const vehicleId = vehicleResult.rows[0].id;
      vehiclesCreated++;

      // Insert ticket
      await client.query(
        `INSERT INTO tickets
           (motorist_name, motorist_id, vehicle_id, violation_type, notes, latitude, longitude, enforcer_name, status, date_issued)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          `${nameObj.first} ${nameObj.last}`,
          motoristId,
          vehicleId,
          vt,
          buildNote(vt),
          coords.latitude,
          coords.longitude,
          pick(ENFORCERS),
          pick(STATUSES),
          randomDateInRange(),
        ],
      );
      ticketsCreated++;

      if ((i + 1) % 50 === 0) {
        console.log(`  ✓ Created ${i + 1}/200 records...`);
      }
    }

    await client.query("COMMIT");

    console.log(`\n  ✓ ${motoristsCreated} motorists inserted`);
    console.log(`  ✓ ${vehiclesCreated} vehicles inserted`);
    console.log(`  ✓ ${ticketsCreated} tickets inserted\n`);

    // Show stats
    const stats = await pool.query(
      "SELECT status, COUNT(*) FROM tickets GROUP BY status ORDER BY COUNT(*) DESC",
    );
    console.log("── Status breakdown ────────────────────────────────");
    stats.rows.forEach(r => console.log(`  ${r.status.padEnd(12)} ${r.count}`));

    const locations = await pool.query(
      `SELECT
        ROUND(latitude::numeric, 4) AS lat,
        ROUND(longitude::numeric, 4) AS lng,
        COUNT(*) AS ticket_count
       FROM tickets
       GROUP BY ROUND(latitude::numeric, 4), ROUND(longitude::numeric, 4)
       ORDER BY ticket_count DESC`,
    );
    console.log("\n── Tickets by location ─────────────────────────────");
    locations.rows.forEach(r =>
      console.log(`  [${r.lat}, ${r.lng}]  ${r.ticket_count} tickets`),
    );

    const topOffenders = await pool.query(
      `SELECT m.first_name, m.last_name, COUNT(*) AS tickets FROM tickets t
       JOIN motorists m ON m.id = t.motorist_id
       GROUP BY m.id, m.first_name, m.last_name
       ORDER BY tickets DESC LIMIT 8`,
    );
    console.log("\n── Top repeat offenders ────────────────────────────");
    topOffenders.rows.forEach(r =>
      console.log(`  ${(r.first_name + ' ' + r.last_name).padEnd(28)} ${r.tickets} tickets`),
    );

    const dateRange = await pool.query(
      `SELECT MIN(date_issued) AS earliest, MAX(date_issued) AS latest FROM tickets`,
    );
    const { earliest, latest } = dateRange.rows[0];
    console.log("\n── Date range ──────────────────────────────────────");
    console.log(`  Earliest: ${new Date(earliest).toDateString()}`);
    console.log(`  Latest:   ${new Date(latest).toDateString()}\n`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\nSeed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedTickets().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
