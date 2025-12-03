import Trip from "../models/Trip.js";
export const listUpcomingTrips = async (req, res) => {
    // Show all trips without date filtering
    const trips = await Trip.find({})
        .populate("vessel")
        .sort({ departureTime: 1 });
    res.json(trips);
};
export const tripDetails = async (req, res) => {
    const trip = await Trip.findById(req.params.id).populate("vessel");
    if (!trip)
        return res.status(404).json({ message: "Trip not found" });
    res.json(trip);
};
//# sourceMappingURL=publicController.js.map