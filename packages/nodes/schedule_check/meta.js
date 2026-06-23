export default {
  backendType: "schedule_check",
  label: "Schedule Check",
  description: "Is it currently within business hours?",
  fields: [
    {
      name: "timezone", label: "Timezone", type: "options", cols: 2, default: "Asia/Kolkata",
      options: [
        "UTC", "Asia/Kolkata", "America/New_York", "America/Los_Angeles",
        "America/Chicago", "Europe/London", "Europe/Berlin", "Asia/Tokyo",
        "Asia/Singapore", "Asia/Dubai", "Australia/Sydney",
      ],
    },
    {
      type: "row",
      fields: [
        { name: "startTime", label: "Start Time", type: "string", smart: false, mono: true, placeholder: "09:00", default: "09:00" },
        { name: "endTime", label: "End Time", type: "string", smart: false, mono: true, placeholder: "18:00", default: "18:00" },
      ],
    },
    {
      name: "days", label: "Working Days", type: "multiOptions",
      default: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      options: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    {
      name: "excludeDates", label: "Exclude Dates (YYYY-MM-DD, comma-separated)", type: "string", smart: true,
      placeholder: "2024-01-26, 2024-08-15",
    },
    {
      name: "includeDates", label: "Extra Working Dates (comma-separated)", type: "string", smart: true,
      placeholder: "2024-01-27",
    },
    {
      name: "failIfOut", label: "Stop if Outside Hours", type: "boolean", default: false,
      hint: "Route to false/error path when out of schedule",
    },
  ],
  outputs: ["isWithinHours", "currentTime", "timezone", "nextWindowStart"],
};
