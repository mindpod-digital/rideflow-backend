const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let jobs = [];

// CREATE RIDE
app.post("/book", (req, res) => {
  const job = {
    id: Date.now().toString(),
    pickup: req.body.pickup,
    dropoff: req.body.dropoff,
    status: "open"
  };
  jobs.push(job);
  res.json(job);
});

// GET JOBS
app.get("/jobs", (req, res) => {
  res.json(jobs.filter(j => j.status === "open"));
});

// ACCEPT JOB
app.post("/accept", (req, res) => {
  const job = jobs.find(j => j.id === req.body.jobId);
  if (job) job.status = "assigned";
  res.json({ success: true });
});

app.listen(3000, () => console.log("Running on port 3000"));
