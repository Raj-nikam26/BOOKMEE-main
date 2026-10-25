// Times are "HH:mm" strings, so plain string comparison is enough.
export const timesOverlap = (startA, endA, startB, endB) => startA < endB && startB < endA;
