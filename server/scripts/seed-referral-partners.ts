/**
 * Optional: seed a handful of SAMPLE referral partners so the Licensee Portal's
 * Referral Hub is demoable before TFO/Katie provides the real vetted directory.
 *
 * Safe to run repeatedly — it no-ops if any partners already exist.
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx server/scripts/seed-referral-partners.ts
 */
import { query } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

const SAMPLE_PARTNERS = [
  { name: "Luke Chatelle, EIT", occupation: "Mechanical Engineer", specialty: "Entity / Operations", rating: 4.8, testimonials: "Sharp on operating-entity restructuring — closed our reorg in weeks." },
  { name: "Brandon Coons", occupation: "Superintendent at K7 Construction", specialty: "Entity / Operations", rating: 4.6, testimonials: "Made the lease separation painless." },
  { name: "Elizabeth Hart, CPA", occupation: "Tax Strategist", specialty: "CPA / Attorney", rating: 4.9, testimonials: "EBITDA recast was airtight in diligence." },
  { name: "Ania Calvillo-Mason, MBA", occupation: "Strategic Planning & Economic Development", specialty: "CPA / Attorney", rating: 4.7, testimonials: "Built the 3-year forecast our bank actually trusted." },
  { name: "Jackie Nguyen, Esq.", occupation: "IP Counsel", specialty: "IP Counsel", rating: 5.0, testimonials: "Moved personally-held IP into the entity ahead of the sale." },
  { name: "Monica DuPea", occupation: "Trademark & Brand Counsel", specialty: "IP Counsel", rating: 4.5, testimonials: "Cleaned up our trademark portfolio fast." },
  { name: "James M. (Jim) Sayler", occupation: "Real Estate & Finance", specialty: "Capital / Lending Partner", rating: 4.4, testimonials: "Found bankable terms when others passed." },
  { name: "Crystal Edwards, M.Ed.", occupation: "Estate & Succession Planning", specialty: "Estate / Asset Protection", rating: 4.8, testimonials: "Our contingency plan finally got funded and current." },
];

async function main() {
  const existing = await query("SELECT COUNT(*)::int AS n FROM referral_partners");
  if (existing.rows[0].n > 0) {
    console.log(`referral_partners already has ${existing.rows[0].n} rows — skipping seed.`);
    process.exit(0);
  }
  for (const p of SAMPLE_PARTNERS) {
    await query(
      `INSERT INTO referral_partners (name, occupation, specialty, testimonials, rating)
       VALUES ($1, $2, $3, $4, $5)`,
      [p.name, p.occupation, p.specialty, p.testimonials, p.rating]
    );
  }
  console.log(`Seeded ${SAMPLE_PARTNERS.length} sample referral partners.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
