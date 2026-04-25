const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   STORAGE
========================= */
let jobs = [];
let drivers = {};

/* =========================
   DRIVER LOCATION UPDATE
========================= */
app.post("/location", (req, res) => {
  const { driverId, lat, lng } = req.body;

  if (!driverId) {
    return res.status(400).json({ error: "Missing driverId" });
  }

  drivers[driverId] = {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    updatedAt: Date.now()
  };

  res.json({ success: true });
});

/* =========================
   DISTANCE CALCULATION
========================= */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

/* =========================
   BOOK RIDE (SMART MATCHING)
========================= */
app.post("/book", (req, res) => {

  const { pickup, dropoff, pickupCoords, price } = req.body;

  let nearbyDrivers = [];

  if (pickupCoords) {
    // find nearby drivers (within 10km)
    for (let id in drivers) {
      const d = getDistance(
        pickupCoords[0],
        pickupCoords[1],
        drivers[id].lat,
        drivers[id].lng
      );

      if (d <= 10) {
        nearbyDrivers.push({
          driverId: id,
          distance: d
        });
      }
    }

    // sort by distance
    nearbyDrivers.sort((a, b) => a.distance - b.distance);
  }

  // take top 3 drivers (Uber-style)
  const assignedDrivers = nearbyDrivers.slice(0, 3).map(d => d.driverId);

  const job = {
    id: Date.now().toString(),
    pickup,
    dropoff,
    pickupCoords,
    assignedDrivers, // 🔥 multiple drivers
    acceptedDriver: null,
    price: price || 0,
    status: "open",
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

  const visibleJobs = jobs.filter(j =>
    j.status === "open" &&
    j.assignedDrivers.includes(driverId)
  );

  res.json(visibleJobs);
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

  if (!job.assignedDrivers.includes(driverId)) {
    return res.status(403).json({ error: "Not eligible" });
  }

  // lock job to first driver
  job.acceptedDriver = driverId;
  job.status = "accepted";

  res.json({ success: true });
});

/* =========================
   DECLINE JOB
========================= */
app.post("/decline", (req, res) => {

  const { jobId, driverId } = req.body;

  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  // remove driver from pool
  job.assignedDrivers = job.assignedDrivers.filter(
    id => id !== driverId
  );

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
   DRIVER LOCATION GET
========================= */
app.get("/driver/:id", (req, res) => {

  const driver = drivers[req.params.id];

  if (!driver) return res.json({});

  res.json(driver);
});

/* =========================
   DEBUG ROUTE (IMPORTANT)
========================= */
app.get("/debug", (req, res) => {
  res.json({
    jobs,
    drivers
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
