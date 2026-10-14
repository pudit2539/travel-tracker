import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getFlights, 
  saveFlights, 
  addOrUpdateFlight, 
  deleteFlight, 
  toggleFlightPaymentStatus,
  syncExpenseToFlight,
  FlightTicket 
} from '../lib/flights';
import { 
  getAccommodations, 
  addAccommodation, 
  toggleAccommodationPaymentStatus,
  syncExpenseToAccommodation 
} from '../lib/accommodations';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('Flights and Expense Synchronization Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('adds and updates manual flight tickets', async () => {
    const tripId = 'trip_flight_1';
    const flight1: FlightTicket = {
      id: 'flight_1',
      tripId,
      airline: 'Thai Airways',
      flightNo: 'TG682',
      originCode: 'BKK',
      originCity: 'Bangkok',
      destCode: 'HND',
      destCity: 'Tokyo Haneda',
      departureDate: '2026-12-04',
      departureTime: '22:45',
      boardingTime: '22:05',
      price: 18500,
      currency: 'THB',
      paymentStatus: 'paid',
      createdAt: Date.now(),
    };

    const list = await addOrUpdateFlight(tripId, flight1);
    expect(list.length).toBe(1);
    expect(list[0].flightNo).toBe('TG682');

    // Update flight seat
    const updated = await addOrUpdateFlight(tripId, { ...flight1, seat: '24K' });
    expect(updated.length).toBe(1);
    expect(updated[0].seat).toBe('24K');

    // Verify localStorage
    const saved = getFlights(tripId);
    expect(saved.length).toBe(1);
    expect(saved[0].seat).toBe('24K');
  });

  it('toggles flight payment status checklist between paid and unpaid', async () => {
    const tripId = 'trip_flight_pay';
    const flight: FlightTicket = {
      id: 'flight_pay_1',
      tripId,
      airline: 'Peach Aviation',
      flightNo: 'MM028',
      originCode: 'BKK',
      originCity: 'Bangkok',
      destCode: 'KIX',
      destCity: 'Osaka Kansai',
      paymentStatus: 'unpaid',
      createdAt: Date.now(),
    };
    await addOrUpdateFlight(tripId, flight);

    // Toggle to paid
    const afterFirstToggle = await toggleFlightPaymentStatus(tripId, 'flight_pay_1');
    expect(afterFirstToggle[0].paymentStatus).toBe('paid');

    // Toggle back to unpaid
    const afterSecondToggle = await toggleFlightPaymentStatus(tripId, 'flight_pay_1');
    expect(afterSecondToggle[0].paymentStatus).toBe('unpaid');
  });

  it('deletes flight correctly', async () => {
    const tripId = 'trip_flight_del';
    const flight1: FlightTicket = {
      id: 'f1',
      tripId,
      airline: 'ANA',
      flightNo: 'NH850',
      originCode: 'BKK',
      originCity: 'Bangkok',
      destCode: 'HND',
      destCity: 'Tokyo',
      createdAt: Date.now(),
    };
    await addOrUpdateFlight(tripId, flight1);
    expect(getFlights(tripId).length).toBe(1);

    const afterDel = await deleteFlight(tripId, 'f1');
    expect(afterDel.length).toBe(0);
    expect(getFlights(tripId).length).toBe(0);
  });

  it('syncs recorded expense with category hotel to Accommodations', async () => {
    const tripId = 'trip_hotel_sync';
    await syncExpenseToAccommodation(tripId, {
      id: 'exp_hotel_1',
      title: 'ค่าที่พัก: Hotel The M\'s Kyoto (3 คืน)',
      amount: 6640,
      currency: 'THB',
      spent_at: '2026-12-05',
    });

    const stays = getAccommodations(tripId);
    expect(stays.length).toBe(1);
    expect(stays[0].name).toBe('Hotel The M\'s Kyoto');
    expect(stays[0].price).toBe(6640);
    expect(stays[0].currency).toBe('THB');
    expect(stays[0].paymentStatus).toBe('paid');
    expect(stays[0].expenseId).toBe('exp_hotel_1');
  });

  it('syncs recorded expense for flight tickets to Flights', async () => {
    const tripId = 'trip_flight_sync';
    await syncExpenseToFlight(tripId, {
      id: 'exp_flight_1',
      title: 'ตั๋วเครื่องบิน TG682 BKK ➔ HND',
      amount: 19500,
      currency: 'THB',
      spent_at: '2026-12-04',
    });

    const flights = getFlights(tripId);
    expect(flights.length).toBe(1);
    expect(flights[0].price).toBe(19500);
    expect(flights[0].paymentStatus).toBe('paid');
    expect(flights[0].expenseId).toBe('exp_flight_1');
  });

  it('toggles accommodation payment status checklist', () => {
    const tripId = 'trip_hotel_pay';
    addAccommodation(tripId, {
      name: 'Granbell Shinjuku',
      checkInDate: '2026-12-01',
      checkOutDate: '2026-12-03',
      nights: 2,
      price: 32000,
      currency: 'JPY',
      paymentStatus: 'unpaid',
    });

    const stays = getAccommodations(tripId);
    expect(stays[0].paymentStatus).toBe('unpaid');

    const toggled = toggleAccommodationPaymentStatus(tripId, stays[0].id);
    expect(toggled[0].paymentStatus).toBe('paid');
  });
});
