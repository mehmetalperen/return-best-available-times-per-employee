const { VercelRequest, VercelResponse } = require('@vercel/node');

/**
 * Calculates the time difference in minutes between two time strings
 * @param {string} time1 - First time in HH:MM:SS format
 * @param {string} time2 - Second time in HH:MM:SS format
 * @returns {number} - Difference in minutes
 */
function getTimeDifferenceInMinutes(time1, time2) {
    const [h1, m1, s1] = time1.split(':').map(Number);
    const [h2, m2, s2] = time2.split(':').map(Number);

    const totalMinutes1 = h1 * 60 + m1 + s1 / 60;
    const totalMinutes2 = h2 * 60 + m2 + s2 / 60;

    return Math.abs(totalMinutes1 - totalMinutes2);
}

/**
 * Finds the best available times for an employee based on the requested booking time
 * @param {Array} availableTimes - Array of available time strings
 * @param {string} requestedTime - The requested booking time in HH:MM:SS format
 * @param {number} maxResults - Maximum number of best times to return (default: 3)
 * @returns {Array} - Array of best available times sorted by closeness to requested time
 */
function findBestAvailableTimes(availableTimes, requestedTime, maxResults = 3) {
    if (!availableTimes || availableTimes.length === 0) {
        return [];
    }

    // Filter out midnight times (00:00:00) as they're likely not real availability
    const filteredTimes = availableTimes.filter(time => time !== '00:00:00');

    if (filteredTimes.length === 0) {
        return [];
    }

    // Calculate time differences and sort by closeness
    const timesWithDifference = filteredTimes.map(time => ({
        time,
        difference: getTimeDifferenceInMinutes(time, requestedTime)
    }));

    // Sort by time difference (closest first)
    timesWithDifference.sort((a, b) => a.difference - b.difference);

    // Return the best times (up to maxResults)
    return timesWithDifference
        .slice(0, maxResults)
        .map(item => item.time);
}

/**
 * Extracts time from ISO datetime string
 * @param {string} isoString - ISO datetime string
 * @returns {string} - Time in HH:MM:SS format
 */
function extractTimeFromISO(isoString) {
    const date = new Date(isoString);
    return date.toTimeString().split(' ')[0]; // Gets HH:MM:SS part
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed. Please use POST.'
        });
    }

    try {
        const { client_booking_time, employees } = req.body;

        // Validate input
        if (!client_booking_time) {
            return res.status(400).json({
                error: 'client_booking_time is required'
            });
        }

        if (!employees || !Array.isArray(employees)) {
            return res.status(400).json({
                error: 'employees array is required'
            });
        }

        // Extract requested time from ISO string
        const requestedTime = extractTimeFromISO(client_booking_time);

        // Process each employee
        const results = employees.map(employee => {
            const employeeId = employee.id;
            const employeeName = employee.name;

            // Extract available times for the requested date
            const requestedDate = new Date(client_booking_time).toISOString().split('T')[0];
            const availableTimes = employee.data?.result?.[requestedDate] || [];

            // Find best available times
            const bestTimes = findBestAvailableTimes(availableTimes, requestedTime, 3);

            return {
                id: employeeId,
                name: employeeName,
                email: employee.email,
                phone: employee.phone,
                description: employee.description,
                requested_time: requestedTime,
                best_available_times: bestTimes,
                total_available_slots: availableTimes.length,
                has_availability: bestTimes.length > 0
            };
        });

        // Sort employees by whether they have availability and how close their best time is
        results.sort((a, b) => {
            // First, prioritize employees with availability
            if (a.has_availability && !b.has_availability) return -1;
            if (!a.has_availability && b.has_availability) return 1;

            // If both have availability, sort by closest time
            if (a.has_availability && b.has_availability) {
                const aBestTime = a.best_available_times[0];
                const bBestTime = b.best_available_times[0];
                const aDiff = getTimeDifferenceInMinutes(aBestTime, requestedTime);
                const bDiff = getTimeDifferenceInMinutes(bBestTime, requestedTime);
                return aDiff - bDiff;
            }

            return 0;
        });

        return res.status(200).json({
            success: true,
            requested_booking_time: client_booking_time,
            requested_time: requestedTime,
            requested_date: requestedDate,
            total_employees: employees.length,
            employees_with_availability: results.filter(emp => emp.has_availability).length,
            results
        });

    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
