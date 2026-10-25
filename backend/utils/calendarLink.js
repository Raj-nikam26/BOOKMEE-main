const compact = (date, time) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;

/**
 * Builds an "Add to Google Calendar" link the customer can open without any OAuth.
 */
export const buildCustomerCalendarUrl = ({ business, service, booking }) => {
  if (!booking?.date || !booking?.startTime || !booking?.endTime) return '';

  const businessName = business?.businessName || business?.name || 'BookMe';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${service?.name || 'Appointment'} with ${businessName}`,
    dates: `${compact(booking.date, booking.startTime)}/${compact(booking.date, booking.endTime)}`,
    ctz: business?.timezone || 'Asia/Kolkata',
    details: [
      `Booking with ${businessName}`,
      booking.notes ? `Notes: ${booking.notes}` : '',
    ].filter(Boolean).join('\n'),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
