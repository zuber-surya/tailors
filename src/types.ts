import { Timestamp } from 'firebase/firestore';

export interface Customer {
  id: string;
  ownerId: string;
  name: string;
  customerNo?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MeasurementValues {
  chest?: number;
  waist?: number;
  hips?: number;
  height?: number;
  neck?: number;
  shoulders?: number;
  sleeves?: number;
  [key: string]: number | undefined;
}

export interface Measurement {
  id: string;
  customerId: string;
  date: Timestamp;
  notes?: string;
  values: MeasurementValues;
  createdAt: Timestamp;
}

export interface CustomerImage {
  id: string;
  customerId: string;
  url: string;
  storagePath?: string;
  caption?: string;
  createdAt: Timestamp;
}
