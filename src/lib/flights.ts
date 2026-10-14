// src/lib/flights.ts
import { supabase } from '@/lib/supabase';

export interface FlightTicket {
  id: string;
  tripId: string;
  airline: string;
  flightNo: string;
  originCode: string;
  originCity: string;
  destCode: string;
  destCity: string;
  departureDate?: string;
  departureTime?: string;
  boardingTime?: string;
  arrivalTime?: string;
  terminal?: string;
  gate?: string;
  seat?: string;
  passengerName?: string;
  bookingRef?: string;
  price?: number;
  currency?: string;
  paymentStatus?: 'paid' | 'unpaid';
  expenseId?: string;
  notes?: string;
  createdAt: number;
}

const STORAGE_PREFIX = 'flight_pass_';

export async function syncFlightsToSupabase(tripId: string, flights: FlightTicket[]): Promise<void> {
  if (!tripId) return;
  try {
    const { data: existing } = await supabase
      .from('itinerary_items')
      .select('id, backup_plan')
      .eq('trip_id', tripId)
      .eq('date_label', '__meta_trip_data__')
      .maybeSingle();

    let payload: any = {};
    if (existing?.backup_plan) {
      try {
        payload = JSON.parse(existing.backup_plan);
      } catch {}
    }

    payload.flights = flights;
    // Backward compatibility for single flight
    if (flights.length > 0) {
      payload.flight = flights[0];
    } else {
      delete payload.flight;
    }

    if (existing?.id) {
      await supabase
        .from('itinerary_items')
        .update({ backup_plan: JSON.stringify(payload) })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('itinerary_items')
        .insert([{
          trip_id: tripId,
          date_label: '__meta_trip_data__',
          main_place: 'SYSTEM_TRIP_METADATA',
          backup_plan: JSON.stringify(payload),
          sort_order: -9999
        }]);
    }
  } catch (err) {
    console.warn('Failed to sync flights to Supabase:', err);
  }
}

export function getFlights(tripId: string): FlightTicket[] {
  if (typeof window === 'undefined' || !tripId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    // Handle single flight object migration
    if (parsed && typeof parsed === 'object') {
      return [{
        ...parsed,
        id: parsed.id || 'flight_default',
        tripId,
        createdAt: parsed.createdAt || Date.now(),
      }];
    }
    return [];
  } catch (err) {
    console.error('Failed to parse flights:', err);
    return [];
  }
}

export async function saveFlights(tripId: string, flights: FlightTicket[]): Promise<void> {
  if (!tripId) return;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(flights));
      window.dispatchEvent(new CustomEvent('travel_tracker_flights_updated', { detail: { tripId, flights } }));
    } catch (e) {
      console.error('Failed to save flights to localStorage', e);
    }
  }
  await syncFlightsToSupabase(tripId, flights);
}

export async function addOrUpdateFlight(tripId: string, flight: FlightTicket): Promise<FlightTicket[]> {
  const current = getFlights(tripId);
  const index = current.findIndex((f) => f.id === flight.id);
  let updated: FlightTicket[];
  if (index >= 0) {
    updated = current.map((f, i) => (i === index ? flight : f));
  } else {
    updated = [...current, flight];
  }
  await saveFlights(tripId, updated);
  return updated;
}

export async function deleteFlight(tripId: string, flightId: string): Promise<FlightTicket[]> {
  const current = getFlights(tripId);
  const updated = current.filter((f) => f.id !== flightId);
  await saveFlights(tripId, updated);
  return updated;
}

export async function toggleFlightPaymentStatus(tripId: string, flightId: string): Promise<FlightTicket[]> {
  const current = getFlights(tripId);
  const updated = current.map((f) => {
    if (f.id === flightId) {
      const nextStatus: 'paid' | 'unpaid' = f.paymentStatus === 'paid' ? 'unpaid' : 'paid';
      return { ...f, paymentStatus: nextStatus };
    }
    return f;
  });
  await saveFlights(tripId, updated);
  return updated;
}

/**
 * Automatically creates or updates a flight ticket entry when an expense with category 'transport' / 'flight' is recorded
 */
export async function syncExpenseToFlight(
  tripId: string,
  expense: { id: string; title: string; amount: number; currency: string; spent_at?: string }
): Promise<void> {
  if (!tripId || !expense) return;
  try {
    const flights = getFlights(tripId);
    const existing = flights.find((f) => f.expenseId === expense.id || f.flightNo.toLowerCase() === expense.title.toLowerCase());

    if (existing) {
      existing.expenseId = expense.id;
      existing.price = expense.amount;
      existing.currency = expense.currency;
      existing.paymentStatus = 'paid';
      await saveFlights(tripId, flights);
    } else {
      const newFlight: FlightTicket = {
        id: 'flight_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        tripId,
        airline: 'ตั๋วเดินทาง/เที่ยวบิน',
        flightNo: expense.title,
        originCode: 'BKK',
        originCity: 'Bangkok',
        destCode: 'DEST',
        destCity: 'Destination',
        departureDate: expense.spent_at || new Date().toISOString().split('T')[0],
        price: expense.amount,
        currency: expense.currency,
        expenseId: expense.id,
        paymentStatus: 'paid',
        createdAt: Date.now(),
      };
      await saveFlights(tripId, [...flights, newFlight]);
    }
  } catch (e) {
    console.error('Failed to sync expense to flight', e);
  }
}
