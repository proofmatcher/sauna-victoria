import Vessel from "../models/Vessel.js";
export const createVessel = async (req, res) => {
    const { name, type, capacity, basePriceCents, minimumDays, discountThreshold, discountPercent } = req.body;
    const vessel = await Vessel.create({
        name,
        type,
        capacity,
        basePriceCents,
        minimumDays,
        discountThreshold,
        discountPercent
    });
    res.status(201).json(vessel);
};
export const listVessels = async (req, res) => {
    const vessels = await Vessel.find().sort({ createdAt: -1 });
    res.json(vessels);
};
export const updateVessel = async (req, res) => {
    try {
        const vesselId = req.params.id;
        const updates = req.body;
        // Check if capacity is being changed
        const isCapacityChanged = updates.capacity !== undefined;
        if (isCapacityChanged) {
            // Handle capacity change with proper validation and trip updates
            const { handleVesselCapacityChange } = await import("../utils/capacityUtils.js");
            const result = await handleVesselCapacityChange(vesselId, updates.capacity);
            if (!result.success) {
                return res.status(400).json({
                    message: result.message,
                    error: "Capacity change validation failed"
                });
            }
            // Remove capacity from updates since it's already handled
            const { capacity, ...otherUpdates } = updates;
            // Apply other updates if any
            let updatedVessel;
            if (Object.keys(otherUpdates).length > 0) {
                updatedVessel = await Vessel.findByIdAndUpdate(vesselId, otherUpdates, { new: true });
            }
            else {
                updatedVessel = await Vessel.findById(vesselId);
            }
            return res.json({
                vessel: updatedVessel,
                capacityChangeResult: result
            });
        }
        else {
            // No capacity change, just regular update
            const updatedVessel = await Vessel.findByIdAndUpdate(vesselId, updates, { new: true });
            if (!updatedVessel) {
                return res.status(404).json({ message: "Vessel not found" });
            }
            res.json({ vessel: updatedVessel });
        }
    }
    catch (error) {
        console.error('Error updating vessel:', error);
        res.status(500).json({ message: "Error updating vessel", error: String(error) });
    }
};
// Specific endpoint for capacity changes with detailed feedback
export const updateVesselCapacity = async (req, res) => {
    try {
        const { id: vesselId } = req.params;
        const { capacity } = req.body;
        if (!capacity || typeof capacity !== 'number' || capacity < 1) {
            return res.status(400).json({
                message: "Valid capacity (positive number) is required"
            });
        }
        const { handleVesselCapacityChange } = await import("../utils/capacityUtils.js");
        const result = await handleVesselCapacityChange(vesselId, capacity);
        if (!result.success) {
            return res.status(400).json(result);
        }
        const updatedVessel = await Vessel.findById(vesselId);
        res.json({
            message: result.message,
            vessel: updatedVessel,
            details: result.details,
            affectedTrips: result.affectedTrips
        });
    }
    catch (error) {
        console.error('Error updating vessel capacity:', error);
        res.status(500).json({
            message: "Error updating vessel capacity",
            error: String(error)
        });
    }
};
export const deleteVessel = async (req, res) => {
    try {
        const vessel = await Vessel.findByIdAndDelete(req.params.id);
        if (!vessel) {
            return res.status(404).json({ message: "Vessel not found" });
        }
        res.status(201).json({
            message: "Vessel deleted successfully",
            deletedVessel: {
                id: vessel._id,
                name: vessel.name
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting vessel" });
    }
};
//# sourceMappingURL=vesselController.js.map