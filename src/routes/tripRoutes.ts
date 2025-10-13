import express from "express";
import { createTrip, listTripsAdmin, updateTrip, deleteTrip } from "../controllers/tripController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/createTrip", protect, authorize("admin"), createTrip);
router.get("/listTrips", protect, authorize("admin"), listTripsAdmin);
router.put("/updateTrip/:id", protect, authorize("admin"), updateTrip);
router.delete("/deleteTrip/:id", protect, authorize("admin"), deleteTrip);

export default router;