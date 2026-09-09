/**
 * Seeds:
 *  - a handful of demo drivers around Jammu (for /api/match to score against)
 *  - one login-ready TEST rider and TEST driver account, so the whole app
 *    can be clicked through immediately without signing up manually first
 *  - one admin account
 * Run once: node seed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Driver = require("./models/Driver");
const Rider = require("./models/Rider");
const Admin = require("./models/Admin");

const ADMIN_EMAIL = "admin@sync.local";
const ADMIN_PASSWORD = "SyncAdmin123"; // change this after first login in any real deployment

const TEST_RIDER = { email: "riya.rider@mietjammu.in", password: "test1234" };
const TEST_DRIVER = { email: "dev.driver@mietjammu.in", password: "test1234" };

const PLACES = {
  trikuta: [32.7196, 74.858],
  gandhi: [32.7332, 74.8697],
  bakshi: [32.728, 74.863],
  channi: [32.698, 74.879],
  roop: [32.7365, 74.856],
  janipur: [32.744, 74.839],
  rehari: [32.7147, 74.8639],
  shastri: [32.7288, 74.8574],
  talab_tillo: [32.7238, 74.8459],
  sarwal: [32.7091, 74.8517],
  greater_kailash: [32.7015, 74.8446],
  narwal: [32.6742, 74.8695],
};

const NAMES = ["Aakash V.", "Ritika S.", "Manav K.", "Priya D.", "Sahil B.", "Neha T.", "Vikram J.", "Simran K.", "Rohan T.", "Kavya M.", "Aditya P.", "Meera S."];
const AREAS = Object.keys(PLACES);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sync_carpool");

  // --- demo/background drivers (not login-capable, just there to be matched against) ---
  await Driver.deleteMany({ driverId: { $ne: "USR_TEST_DRIVER" } });
  const seedDrivers = NAMES.map((name, i) => {
    const base = PLACES[AREAS[i % AREAS.length]];
    return {
      driverId: `USR_D${1000 + i}_DRIVER`,
      name,
      phone: `9${String(100000000 + i * 137).padStart(9, "0")}`.slice(0, 10),
      plateNumber: `JK02 ${String.fromCharCode(65 + i)}${String.fromCharCode(66 + i)} ${1000 + i}`,
      vehicle: ["Hatchback", "Sedan", "SUV"][i % 3],
      isEV: i % 5 === 0, // every 5th demo driver drives an EV
      userType: i % 4 === 0 ? "faculty" : "student",
      ac: i % 4 !== 0,
      smoking: i % 6 === 0,
      music: i % 3 !== 0,
      gender: i % 2 === 0 ? "M" : "F",
      rating: +(3.7 + Math.random() * 1.2).toFixed(1),
      rideCount: Math.floor(Math.random() * 150) + 5,
      homeBase: { lat: base[0] + (Math.random() - 0.5) * 0.02, lng: base[1] + (Math.random() - 0.5) * 0.02 },
      isOnline: true,
      typicalDepartureMinute: 6 * 60 + Math.floor(Math.random() * 180),
    };
  });
  await Driver.insertMany(seedDrivers);
  console.log(`Seeded ${seedDrivers.length} background drivers.`);

  // --- one login-ready test driver (this is the one to sign in as and actually drive) ---
  await Driver.deleteOne({ driverId: "USR_TEST_DRIVER" });
  await Driver.create({
    driverId: "USR_TEST_DRIVER",
    name: "Dev Driver",
    email: TEST_DRIVER.email,
    passwordHash: await bcrypt.hash(TEST_DRIVER.password, 10),
    phone: "9999900000",
    gender: "M",
    userType: "student",
    vehicle: "Hatchback",
    plateNumber: "JK02 TS 0001",
    licenseNumber: "JK-DL-000111",
    isEV: false,
    upiId: "dev.driver@okhdfcbank",
    ac: true, smoking: false, music: true,
    rating: 4.6, rideCount: 42,
    homeBase: { lat: PLACES.trikuta[0], lng: PLACES.trikuta[1] },
    isOnline: true,
    typicalDepartureMinute: 8 * 60 + 15,
  });

  // --- one login-ready test rider ---
  await Rider.deleteOne({ riderId: "USR_TEST_RIDER" });
  await Rider.create({
    riderId: "USR_TEST_RIDER",
    name: "Riya Rider",
    email: TEST_RIDER.email,
    passwordHash: await bcrypt.hash(TEST_RIDER.password, 10),
    phone: "9999900001",
    gender: "F",
    userType: "student",
    prefAc: true, prefNoSmoking: true, prefSameGender: false, prefEvOnly: false,
    rating: 4.5, rideCount: 8,
  });

  // --- admin ---
  await Admin.deleteMany({});
  await Admin.create({ name: "SYNC Admin", email: ADMIN_EMAIL, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) });

  console.log("\nTest accounts ready to sign in with:");
  console.log(`  Rider  -> email: ${TEST_RIDER.email}   password: ${TEST_RIDER.password}`);
  console.log(`  Driver -> email: ${TEST_DRIVER.email}  password: ${TEST_DRIVER.password}`);
  console.log(`  Admin  -> email: ${ADMIN_EMAIL}  password: ${ADMIN_PASSWORD}`);
  console.log("Change these before any real deployment — they're fixed, known credentials for local testing only.\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
