// Booking dates and times ("2026-10-12", "10:00") are wall-clock times in the
// marketplace's home timezone. Cloud servers run in UTC, which would make
// "has this slot already passed?" wrong by five and a half hours for India.
// Pin the process to the home timezone unless the host sets TZ itself.
// Imported first in server.js, before any date is created.
process.env.TZ = process.env.TZ || 'Asia/Kolkata';
