const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let jobs = [];
let drivers = {};

/* =========================
   UPDATE DRIVER LOCATION
========================= */
app.post("/location", (req, res) => {
  const { driverId, lat, lng } = req.body;

  drivers[driverId] = {
    lat,
    lng
  };

  res.json({ success: true });
});

/* =========================
   FIND NEAREST DRIVER
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
   BOOK + AUTO MATCH
========================= */
app.post("/book", (req, res) => {

  const { pickup, dropoff, pickupCoords } = req.body;

  if (!pickupCoords) {
    return res.json({ error: "Missing coordinates" });
  }

  let nearestDriver = null;
  let minDistance = Infinity;

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
    assignedDriver: nearestDriver,
    distance: minDistance
  };

  jobs.push(job);

  res.json(job);
});

/* =========================
   GET DRIVER JOBS
========================= */
app.get("/jobs/:driverId", (req, res) => {
  const driverId = req.params.driverId;

  const assigned = jobs.filter(j => j.assignedDriver === driverId);

  res.json(assigned);
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on " + PORT);
});
