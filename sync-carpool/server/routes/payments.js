const express = require("express");
const crypto = require("crypto");
const Ride = require("../models/Ride");

/**
 * Real Razorpay integration for online payment (covers UPI apps — GPay,
 * PhonePe, Paytm, BHIM — plus cards, since Razorpay's Checkout widget
 * offers all of those from one integration; there's no separate SDK per
 * UPI app). Needs your own Razorpay account: sign up free at
 * https://dashboard.razorpay.com/signup, grab the **Test Mode** Key ID and
 * Key Secret, and put them in server/.env. Test mode works with Razorpay's
 * documented test card/UPI numbers — no real money moves, and no business
 * verification is required to test.
 */
module.exports = () => {
  const router = express.Router();

  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  let razorpay = null;
  if (KEY_ID && KEY_SECRET) {
    const Razorpay = require("razorpay");
    razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  }

  // POST /api/payments/order/:rideId — create a Razorpay order for this rider's share
  router.post("/order/:rideId", async (req, res) => {
    if (!razorpay) {
      return res.status(503).json({
        error: "Razorpay isn't configured on this server yet — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env (free test-mode keys from dashboard.razorpay.com).",
      });
    }
    try {
      const ride = await Ride.findById(req.params.rideId);
      if (!ride) return res.status(404).json({ error: "ride not found" });
      if (!ride.fare?.perRiderRs) return res.status(400).json({ error: "this ride doesn't have a fare set yet" });

      const amountPaise = Math.round(ride.fare.perRiderRs * 100);
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: `ride_${ride._id}`,
        notes: { rideId: String(ride._id), riderId: ride.riderId },
      });

      ride.fare.razorpayOrderId = order.id;
      ride.fare.method = "razorpay";
      await ride.save();

      res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: KEY_ID });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/payments/verify — verify the signature Razorpay Checkout returns after a successful payment
  router.post("/verify", async (req, res) => {
    if (!KEY_SECRET) return res.status(503).json({ error: "Razorpay isn't configured on this server" });
    try {
      const { rideId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const expected = crypto
        .createHmac("sha256", KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expected !== razorpay_signature) {
        return res.status(400).json({ ok: false, error: "payment signature mismatch — this payment could not be verified" });
      }

      const ride = await Ride.findByIdAndUpdate(
        rideId,
        {
          "fare.status": "paid",
          "fare.razorpayPaymentId": razorpay_payment_id,
          "fare.paidAt": new Date(),
        },
        { new: true, returnDocument: "after" }
      );
      if (!ride) return res.status(404).json({ error: "ride not found" });
      res.json({ ok: true, fare: ride.fare });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/payments/cash/:rideId — rider/driver agree to settle in cash instead
  router.post("/cash/:rideId", async (req, res) => {
    const ride = await Ride.findByIdAndUpdate(
      req.params.rideId,
      { "fare.method": "cash", "fare.status": "paid", "fare.paidAt": new Date() },
      { new: true, returnDocument: "after" }
    );
    if (!ride) return res.status(404).json({ error: "ride not found" });
    res.json({ ok: true, fare: ride.fare });
  });

  return router;
};
