export default function EnhancedFlightSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center space-x-4">
            {/* Time */}
            <div className="w-16 h-4 bg-gray-200 rounded"></div>

            {/* Flight number */}
            <div className="w-20 h-4 bg-gray-200 rounded"></div>

            {/* Airline */}
            <div className="w-24 h-4 bg-gray-200 rounded"></div>

            {/* Destination */}
            <div className="w-12 h-4 bg-gray-200 rounded"></div>

            {/* Registration */}
            <div className="w-16 h-4 bg-gray-200 rounded"></div>

            {/* Status */}
            <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

