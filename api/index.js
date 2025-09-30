// Vercel API handler

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
    // Extract time directly from ISO string without timezone conversion
    // Format: "2025-09-10T09:00:00-05:00" -> "09:00:00"
    const timeMatch = isoString.match(/T(\d{2}:\d{2}:\d{2})/);
    if (timeMatch) {
        return timeMatch[1];
    }

    // Fallback to date parsing if regex fails
    const date = new Date(isoString);
    return date.toTimeString().split(' ')[0];
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
        const { client_booking_time, employees, target_employee } = req.body;

        // Validate input
        if (!client_booking_time) {
            return res.status(400).json({
                error: 'client_booking_time is required'
            });
        }

        if (!employees) {
            return res.status(400).json({
                error: 'employees is required'
            });
        }

        // Handle different input formats
        let employeesArray;
        if (Array.isArray(employees)) {
            employeesArray = employees;
        } else if (typeof employees === 'object') {
            // Check if it's Make.com format with nested 'array' property
            if (employees.array && Array.isArray(employees.array)) {
                employeesArray = employees.array;
            } else {
                // Convert single object to array
                employeesArray = [employees];
            }
        } else {
            return res.status(400).json({
                error: 'employees must be an object or array'
            });
        }

        // Extract requested time from ISO string
        const requestedTime = extractTimeFromISO(client_booking_time);
        // Extract date from ISO string without timezone conversion to avoid UTC conversion issues
        // Use regex to extract date part before 'T' to avoid any timezone conversion
        const dateMatch = client_booking_time.match(/^(\d{4}-\d{2}-\d{2})T/);
        const requestedDate = dateMatch ? dateMatch[1] : client_booking_time.split('T')[0];

        // Process each employee
        const results = employeesArray.map(employee => {
            const employeeId = employee.id;
            const employeeName = employee.name;
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

        // Create best_availability field with top 3 best times across all employees
        const allBestTimes = [];
        results.forEach(employee => {
            if (employee.has_availability) {
                employee.best_available_times.forEach(time => {
                    const difference = getTimeDifferenceInMinutes(time, requestedTime);
                    allBestTimes.push({
                        employee_id: employee.id,
                        employee_name: employee.name,
                        employee_email: employee.email,
                        employee_phone: employee.phone,
                        employee_description: employee.description,
                        availability_time: time,
                        time_difference_minutes: difference
                    });
                });
            }
        });

        // Sort by time difference and take top 3
        allBestTimes.sort((a, b) => a.time_difference_minutes - b.time_difference_minutes);
        const bestAvailability = allBestTimes.slice(0, 3);

        // Handle target employee availability
        let availabilityTargetEmployee = null;
        if (target_employee) {
            // Find the target employee in the employees array
            const targetEmp = employeesArray.find(emp =>
                emp.id === target_employee.id ||
                emp.name === target_employee.name
            );

            if (targetEmp) {
                const targetAvailableTimes = targetEmp.data?.result?.[requestedDate] || [];
                const targetBestTimes = findBestAvailableTimes(targetAvailableTimes, requestedTime, 3);

                // Format results with employee details like best_availability
                const formattedResults = targetBestTimes.map(time => ({
                    employee_id: targetEmp.id,
                    employee_name: targetEmp.name,
                    employee_email: targetEmp.email,
                    employee_phone: targetEmp.phone,
                    employee_description: targetEmp.description,
                    availability_time: time,
                    time_difference_minutes: getTimeDifferenceInMinutes(time, requestedTime)
                }));

                availabilityTargetEmployee = {
                    results: formattedResults,
                    success: formattedResults.length > 0
                };
            } else {
                availabilityTargetEmployee = {
                    results: [],
                    success: false
                };
            }
        }

        return res.status(200).json({
            success: true,
            requested_booking_time: client_booking_time,
            requested_time: requestedTime,
            requested_date: requestedDate,
            total_employees: employeesArray.length,
            employees_with_availability: results.filter(emp => emp.has_availability).length,
            best_availability: bestAvailability,
            availability_target_employee: availabilityTargetEmployee,
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
