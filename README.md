# Best Available Times API

This Vercel API finds the best available times for employees based on their closest availability to a requested booking time.

## Features

- Finds the 3 best available times for each employee closest to the requested booking time
- Filters out midnight times (00:00:00) as they're likely not real availability
- Sorts employees by availability and proximity to requested time
- Handles time zone conversions from ISO datetime strings
- Returns comprehensive response with metadata

## API Endpoint

**POST** `/api`

### Request Body

```json
{
  "client_booking_time": "2025-09-10T09:00:00-05:00",
  "employees": [
    {
      "id": "6",
      "data": {
        "result": {
          "2025-09-10": ["09:45:00", "11:45:00", "13:45:00"]
        }
      },
      "name": "Mehmet",
      "email": null,
      "phone": null,
      "description": null
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "requested_booking_time": "2025-09-10T09:00:00-05:00",
  "requested_time": "09:00:00",
  "requested_date": "2025-09-10",
  "total_employees": 5,
  "employees_with_availability": 5,
  "results": [
    {
      "id": "9",
      "name": "Fatih",
      "email": null,
      "phone": null,
      "description": null,
      "requested_time": "09:00:00",
      "best_available_times": ["09:25:00", "12:30:00", "14:30:00"],
      "total_available_slots": 11,
      "has_availability": true
    }
  ]
}
```

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Test the API:

```bash
node test.js
```

## Deployment to Vercel

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Deploy:

```bash
vercel
```

3. Your API will be available at: `https://your-project-name.vercel.app/api`

## How It Works

1. **Time Extraction**: Extracts the time portion from the ISO datetime string
2. **Availability Filtering**: Filters out midnight times (00:00:00) as they're likely not real availability
3. **Time Difference Calculation**: Calculates the time difference in minutes between each available time and the requested time
4. **Best Times Selection**: Selects up to 3 times closest to the requested time for each employee
5. **Employee Sorting**: Sorts employees by availability status and proximity to requested time

## Example Usage

For a client requesting availability at 09:00:00:

- Employee with 09:25:00 availability will be ranked higher than one with 12:15:00
- Employees with no availability will be ranked last
- The API returns the 3 closest available times for each employee

## Error Handling

The API includes comprehensive error handling for:

- Missing required fields
- Invalid datetime formats
- Malformed employee data
- Server errors

All errors return appropriate HTTP status codes and descriptive error messages.
