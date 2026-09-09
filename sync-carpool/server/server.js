require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const driverRoutes = require("./routes/drivers");
const riderRoutes = require("./routes/riders");
const matchRoutes = require("./routes/match");
const rideRoutesFactory = require("./routes/rides");
const adminRoutes = require("./routes/admin");
const recurringRoutes = require("./routes/recurring");
const paymentRoutesFactory = require("./routes/payments");
const { router: authRoutes } = require("./routes/auth");
const { startRecurringRideCron } = require("./jobs/recurringRides");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" })); // raised for base64 profile photo uploads

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || "*" } });

app.use("/api/auth", authRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/rides", rideRoutesFactory(io));
app.use("/api/admin", adminRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/payments", paymentRoutesFactory());

app.get("/api/health", (req, res) => res.json({ ok: true, service: "sync-carpool-api" }));

// Clients join a ride's room to receive live location + status broadcasts
io.on("connection", (socket) => {
  socket.on("ride:join", (rideId) => socket.join(rideId));
  socket.on("ride:leave", (rideId) => socket.leave(rideId));
});

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sync_carpool";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`SYNC Carpool API listening on http://localhost:${PORT}`));
    startRecurringRideCron(io);
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    console.error("Start MongoDB locally, or set MONGO_URI to an Atlas connection string in .env");
    process.exit(1);
  });
