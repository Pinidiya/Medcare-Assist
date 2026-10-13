import { useContext } from 'react';
import { PharmacyContext } from '../context/PharmacyContext';

export function usePharmacyData() {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error("usePharmacyData must be used within a PharmacyProvider");
  }
  return context;
}
