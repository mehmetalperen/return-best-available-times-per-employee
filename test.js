const testData = {
    client_booking_time: "2025-09-10T09:00:00-05:00",
    employees: [
        {
            "id": "6",
            "data": {
                "result": {
                    "2025-09-10": [
                        "00:00:00",
                        "02:00:00",
                        "04:00:00",
                        "06:00:00",
                        "09:45:00",
                        "11:45:00",
                        "13:45:00",
                        "15:45:00",
                        "17:45:00",
                        "19:45:00",
                        "21:45:00"
                    ]
                },
                "id": "3",
                "jsonrpc": "2.0"
            },
            "name": "Mehmet",
            "email": null,
            "phone": null,
            "description": null
        },
        {
            "id": "7",
            "data": {
                "result": {
                    "2025-09-10": [
                        "00:00:00",
                        "02:00:00",
                        "04:00:00",
                        "06:00:00",
                        "12:15:00",
                        "14:15:00",
                        "16:15:00",
                        "18:15:00",
                        "20:15:00"
                    ]
                },
                "id": "3",
                "jsonrpc": "2.0"
            },
            "name": "Alperen",
            "email": null,
            "phone": null,
            "description": null
        },
        {
            "id": "8",
            "data": {
                "result": {
                    "2025-09-10": [
                        "00:00:00",
                        "02:00:00",
                        "04:00:00",
                        "06:00:00",
                        "12:10:00",
                        "14:10:00",
                        "16:10:00",
                        "18:10:00",
                        "20:10:00"
                    ]
                },
                "id": "3",
                "jsonrpc": "2.0"
            },
            "name": "Nadi",
            "email": null,
            "phone": null,
            "description": null
        },
        {
            "id": "9",
            "data": {
                "result": {
                    "2025-09-10": [
                        "00:00:00",
                        "02:00:00",
                        "04:00:00",
                        "06:00:00",
                        "09:25:00",
                        "12:30:00",
                        "14:30:00",
                        "16:30:00",
                        "18:30:00",
                        "20:30:00"
                    ]
                },
                "id": "3",
                "jsonrpc": "2.0"
            },
            "name": "Fatih",
            "email": null,
            "phone": null,
            "description": null
        },
        {
            "id": "10",
            "data": {
                "result": {
                    "2025-09-10": [
                        "00:00:00",
                        "02:00:00",
                        "04:00:00",
                        "06:00:00",
                        "08:00:00",
                        "10:00:00",
                        "12:00:00",
                        "14:00:00",
                        "16:00:00",
                        "18:00:00",
                        "20:00:00"
                    ]
                },
                "id": "3",
                "jsonrpc": "2.0"
            },
            "name": "Aydin",
            "email": null,
            "phone": null,
            "description": null
        }
    ]
};

// Test the API locally
async function testAPI() {
    try {
        const response = await fetch('http://localhost:3000/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const result = await response.json();
        console.log('API Response:');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error testing API:', error);
    }
}

// Export for use in other files
module.exports = { testData, testAPI };

// Run test if this file is executed directly
if (require.main === module) {
    testAPI();
}
