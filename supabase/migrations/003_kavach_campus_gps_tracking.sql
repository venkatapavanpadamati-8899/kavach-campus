-- 003_kavach_campus_gps_tracking.sql

-- Enable RLS on incident_locations
ALTER TABLE incident_locations ENABLE ROW LEVEL SECURITY;

-- 1. Students can insert locations for their own incidents
CREATE POLICY "Students can insert own incident locations" ON incident_locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents 
            WHERE incidents.id = incident_id 
            AND incidents.student_id = auth.uid()
        )
    );

-- 2. Students can view locations of their own incidents
CREATE POLICY "Students can view own incident locations" ON incident_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM incidents 
            WHERE incidents.id = incident_id 
            AND incidents.student_id = auth.uid()
        )
    );

-- 3. Staff can view all incident locations
CREATE POLICY "Staff can view all incident locations" ON incident_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')
        )
    );

-- Add tracking session control to incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS is_tracking_active BOOLEAN DEFAULT FALSE;

-- Add duty zone to staff profiles to help with nearby staff assignment
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS duty_zone_id UUID REFERENCES campus_zones(id);

-- Optional: Create a function for Haversine distance in Postgres for advanced queries
-- (latitude, longitude, latitude, longitude) -> distance in meters
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
DECLARE
    radius float := 6371000; -- Earth radius in meters
    dlat float;
    dlon float;
    a float;
    c float;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN radius * c;
END;
$$ LANGUAGE plpgsql;
