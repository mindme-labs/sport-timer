// Imports docs/program-v3.json as the active program for USER_ID.
// Mirrors createProgram(): deactivates the current active program, inserts the new one.
// Existing workout logs are NOT touched.
//
// Run from the repo root:  node scripts/import-program.js
//
const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const ROOT = path.resolve(__dirname, "..");
const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const uri = env
  .split("\n")
  .find((l) => l.startsWith("ttt_MONGODB_URI="))
  .slice("ttt_MONGODB_URI=".length)
  .trim()
  .replace(/^["']|["']$/g, "");

const program = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs", "program-v3.json"), "utf8")
);

const USER_ID = "69a48baa4233c41dd7f314ac"; // ilia.fedorov@gmail.com

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db("sport-timer").collection("programs");
  const userId = new ObjectId(USER_ID);

  const deact = await col.updateMany(
    { userId, isActive: true },
    { $set: { isActive: false } }
  );
  console.log("Deactivated active programs:", deact.modifiedCount);

  const res = await col.insertOne({
    userId,
    isActive: true,
    cycleLengthDays: program.cycleLengthDays,
    startDate: new Date(),
    skipDayOffset: 0,
    routines: program.routines,
  });
  console.log("Inserted new active program:", res.insertedId.toString());

  const active = await col.findOne({ userId, isActive: true });
  console.log(
    "Active now:",
    active.routines.map((r) => `${r.cycleDayNumber}:${r.workouts[0]?.name || "отдых"}`).join(" | ")
  );

  await client.close();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
