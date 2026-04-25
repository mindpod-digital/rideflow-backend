const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   DATA STORAGE (TEMP)
========================= */
let jobs = [];
let drivers = {};

/* =========================
   CREATE RIDE
========================= */
app.post("/book", (req, res) => {
  const { pickup, dropoff } = req.body;

  const job = {
    id: Date.now().toString(),
    pickup,
    dropoff,
    status: "open"
  };

  jobs.push(job);

  res.json(job);
});

/* =========================
   GET AVAILABLE JOBS
========================= */
app.get("/jobs", (req, res) => {
  res.json(jobs.filter(j => j.status === "open"));
});

/* =========================
   ACCEPT JOB
========================= */
app.post("/accept", (req, res) => {
  const { jobId } = req.body;

  const job = jobs.find(j => j.id === jobId);

  if (job) {
    job.status = "assigned";
  }

  res.json({ success: true });
});

/* =========================
   DRIVER LOCATION UPDATE
========================= */
app.post("/location", (req, res) => {
  const { driverId, lat, lng } = req.body;

  drivers[driverId] = { lat, lng };

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
   ROOT (OPTIONAL)
========================= */
app.get("/", (req, res) => {
  res.send("RideFlow Backend Running 🚀");
});

/* =========================
   START SERVER (IMPORTANT)
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
