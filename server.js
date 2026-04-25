const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   IN-MEMORY STORAGE
========================= */
let jobs = [];
let drivers = {};

/* =========================
   DRIVER LOCATION UPDATE
========================= */
app.post("/location", (req, res) => {
  const { driverId, lat, lng } = req.body;

  if (!driverId || lat == null || lng == null) {
    return res.status(400).json({ error: "Missing driver data" });
  }

  drivers[driverId] = {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    lastUpdated: Date.now()
  };

  res.json({ success: true });
});

/* =========================
   DISTANCE (HAVERSINE)
========================= */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

/* =========================
   BOOK RIDE + MATCH DRIVER
========================= */
app.post("/book", (req, res) => {

  const { pickup, dropoff, pickupCoords, price } = req.body;

  if (!pickupCoords) {
    return res.status(400).json({ error: "Missing pickup coordinates" });
  }

  let nearestDriver = null;
  let minDistance = Infinity;

  // find closest driver
  for (let id in drivers) {

    const d = getDistance(
      pickupCoords[0],
      pickupCoords[1],
      drivers[id].lat,
      drivers[id].lng
    );

    if (d < minDistance) {
      minDistance = d;
      nearestDriver = id;
    }
  }

  const job = {
    id: Date.now().toString(),
    pickup,
    dropoff,
    pickupCoords,
    assignedDriver: nearestDriver,
    distance: minDistance,
    price: price || 0,
    status: nearestDriver ? "assigned" : "unassigned",
    createdAt: Date.now()
  };

  jobs.push(job);

  res.json(job);
});

/* =========================
   GET JOBS FOR DRIVER
========================= */
app.get("/jobs/:driverId", (req, res) => {

  const driverId = req.params.driverId;

  const assignedJobs = jobs.filter(
    j => j.assignedDriver === driverId && j.status !== "completed"
  );

  res.json(assignedJobs);
});

/* =========================
   ACCEPT JOB
========================= */
app.post("/accept", (req, res) => {

  const { jobId, driverId } = req.body;

  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  if (job.assignedDriver !== driverId) {
    return res.status(403).json({ error: "Not your job" });
  }

  job.status = "accepted";

  res.json({ success: true });
});

/* =========================
   DECLINE JOB
========================= */
app.post("/decline", (req, res) => {

  const { jobId } = req.body;

  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  // release job back to pool
  job.assignedDriver = null;
  job.status = "open";

  res.json({ success: true });
});

/* =========================
   COMPLETE JOB
========================= */
app.post("/complete", (req, res) => {

  const { jobId } = req.body;

  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  job.status = "completed";

  res.json({ success: true });
});

/* =========================
   GET DRIVER LOCATION
========================= */
app.get("/driver/:id", (req, res) => {

  const driver = drivers[req.params.id];

  if (!driver) {
    return res.json({});
  }

  res.json(driver);
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("RideFlow Backend Running 🚀");
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
