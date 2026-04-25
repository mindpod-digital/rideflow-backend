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
   BOOK RIDE (TEST MODE)
========================= */
app.post("/book", (req, res) => {

  const { pickup, dropoff, pickupCoords, price } = req.body;

  // 🔥 TEST MODE: assign ALL drivers
  const assignedDrivers = Object.keys(drivers);

  const job = {
    id: Date.now().toString(),
    pickup,
    dropoff,
    pickupCoords,
    assignedDrivers,
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

  // 🔥 lock job to first driver
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

  // remove driver from job pool
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
   GET DRIVER LOCATION
========================= */
app.get("/driver/:id", (req, res) => {

  const driver = drivers[req.params.id];

  if (!driver) return res.json({});

  res.json(driver);
});

/* =========================
   DEBUG ROUTE
========================= */
app.get("/debug", (req, res) => {
  res.json({
    drivers,
    jobs
  });
});

/* =========================
   ROOT CHECK
========================= */
app.get("/", (req, res) => {
  res.send("RideFlow Backend Running (TEST MODE) 🚀");
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
