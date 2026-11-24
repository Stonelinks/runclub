-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activityType" TEXT NOT NULL DEFAULT 'cycling',
    "geojson" TEXT NOT NULL,
    "waypoints" TEXT NOT NULL,
    "distanceMeters" REAL NOT NULL,
    "elevationGainM" REAL NOT NULL DEFAULT 0,
    "elevationLossM" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
