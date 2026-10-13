import { PharmacyProvider } from './context/PharmacyContext';
import PageLayout from '../../components/layout/PageLayout';

export default function PharmacistDashboard() {
  return (
    <PharmacyProvider>
      <PageLayout />
    </PharmacyProvider>
  );
}
