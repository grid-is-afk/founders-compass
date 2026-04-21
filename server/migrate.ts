import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./db.js";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

console.log("Running migrations…");
await query(sql);
console.log("Done.");
process.exit(0);
