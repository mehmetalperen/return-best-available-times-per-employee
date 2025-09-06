const http = require('http');
const url = require('url');

// Copy the API logic functions
function getTimeDifferenceInMinutes(time1, time2) {
    const [h1, m1, s1] = time1.split(':').map(Number);
    const [h2, m2, s2] = time2.split(':').map(Number);

    const totalMinutes1 = h1 * 60 + m1 + s1 / 60;
    const totalMinutes2 = h2 * 60 + m2 + s2 / 60;

    return Math.abs(totalMinutes1 - totalMinutes2);
}

function findBestAvailableTimes(availableTimes, requestedTime, maxResults = 3) {
    if (!availableTimes || availableTimes.length === 0) {
        return [];
    }

    const filteredTimes = availableTimes.filter(time => time !== '00:00:00');

    if (filteredTimes.length === 0) {
        return [];
    }

    const timesWithDifference = filteredTimes.map(time => ({
        time,
        difference: getTimeDifferenceInMinutes(time, requestedTime)
    }));

    timesWithDifference.sort((a, b) => a.difference - b.difference);

    return timesWithDifference
        .slice(0, maxResults)
        .map(item => item.time);
}

function extractTimeFromISO(isoString) {
    const date = new Date(isoString);
    return date.toTimeString().split(' ')[0];
}

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            error: 'Method not allowed. Please use POST.'
        }));
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            const { client_booking_time, employees, target_employee } = JSON.parse(body);

            // Validate input
            if (!client_booking_time) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    error: 'client_booking_time is required'
                }));
            }

            if (!employees || !Array.isArray(employees)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    error: 'employees array is required'
                }));
            }

            // Extract requested time from ISO string
            const requestedTime = extractTimeFromISO(client_booking_time);
            const requestedDate = new Date(client_booking_time).toISOString().split('T')[0];

            // Process each employee
            const results = employees.map(employee => {
                const employeeId = employee.id;
                const employeeName = employee.name;

                // Extract available times for the requested date
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
                const targetEmp = employees.find(emp =>
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

            const response = {
                success: true,
                requested_booking_time: client_booking_time,
                requested_time: requestedTime,
                requested_date: requestedDate,
                total_employees: employees.length,
                employees_with_availability: results.filter(emp => emp.has_availability).length,
                best_availability: bestAvailability,
                availability_target_employee: availabilityTargetEmployee,
                results
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response, null, 2));

        } catch (parseError) {
            console.error('Error parsing request body:', parseError);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Invalid JSON in request body',
                message: parseError.message
            }));
        }
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🚀 Local API server running on http://localhost:${PORT}`);
    console.log('Ready for curl testing!');
});
