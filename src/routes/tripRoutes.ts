import express from "express";
import { createTrip, listTripsAdmin, getTripById, updateTrip, deleteTrip, notifyStaff } from "../controllers/tripController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/createTrip", protect, authorize("admin"), createTrip);
router.get("/listTrips", protect, authorize("admin"), listTripsAdmin);
router.get("/getTrip/:id", protect, authorize("admin"), getTripById); // Get single trip with capacity
router.put("/updateTrip/:id", protect, authorize("admin"), updateTrip);
router.delete("/deleteTrip/:id", protect, authorize("admin"), deleteTrip);
router.post("/:id/notify-staff", protect, authorize("admin"), notifyStaff);  // Notify staff about trip

export default router;