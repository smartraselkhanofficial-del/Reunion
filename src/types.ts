export interface EventRegistration {
  id: string; // Document ID = uid
  uid: string;
  name: string;
  phone: string;
  tshirt: string;
  guestCount: number;
  paymentStatus: 'unpaid' | 'paid';
  timestamp: number;
}
