const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   OPTIONAL: STRIPE SETUP
========================= */
let stripe = null;
try {
  const Stripe = require("stripe");
  stripe = new Stripe("sk_test_YOUR_SECRET_KEY"); // 🔥 replace later
} catch (e) {
  console.log("Stripe not installed (ok for testing)");
}

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
   BOOK RIDE (TEST FRIENDLY)
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
    price: parseFloat(price) || 10,
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

  const visibleJobs = jobs.filter(job => {

    // 🔒 if accepted → only assigned driver sees it
    if (job.status === "accepted") {
      return job.acceptedDriver === driverId;
    }

    // open jobs → visible to assigned drivers
    return job.status === "open" &&
           job.assignedDrivers.includes(driverId);
  });

  res.json(visibleJobs);
});

/* =========================
   ACCEPT JOB (LOCK)
========================= */
app.post("/accept", (req, res) => {

  const { jobId, driverId } = req.body;

  const job = jobs.find(j => j.id === jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  if (job.status !== "open") {
    return res.status(400).json({ error: "Already taken" });
  }

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
  if (!job) return res.status(404).json({ error: "Job not found" });

  job.assignedDrivers = job.assignedDrivers.filter(
    id => id !== driverId
  );

  res.json({ success: true });
});

/* =========================
   COMPLETE JOB + PAYMENT
========================= */
app.post("/complete", async (req, res) => {

  const { jobId } = req.body;

  const job = jobs.find(j => j.id === jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  job.status = "completed";

  // 💳 Stripe payment (optional)
  if (stripe) {
    try {
      const amount = Math.round(job.price * 100);

      await stripe.paymentIntents.create({
        amount,
        currency: "gbp",
        application_fee_amount: Math.round(amount * 0.1)
        // 🔥 add transfer_data when you onboard drivers
      });

      console.log("Payment processed");
    } catch (err) {
      console.log("Stripe error:", err.message);
    }
  }

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
   DEBUG ROUTE
========================= */
app.get("/debug", (req, res) => {
  res.json({
    drivers,
    jobs
  });
});

/* =========================
   ROOT
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
