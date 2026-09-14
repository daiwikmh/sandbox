import { WalletProvider } from '../src/midnight/wallet';
import { AuthGuard } from '../src/components/auth';
import { DashboardShell } from '../src/components/shell/DashboardShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AuthGuard>
        <DashboardShell>{children}</DashboardShell>
      </AuthGuard>
    </WalletProvider>
  );
}
