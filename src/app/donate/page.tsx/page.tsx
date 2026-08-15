import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Smartphone, Building2, Clock, Info } from 'lucide-react';

export const metadata = { title: 'Support DropToGit' };

export default function DonatePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Support{' '}
            <span className="text-primary">DropToGit</span>
          </h1>
        </div>
        <div className="text-muted-foreground leading-relaxed space-y-3">
          <p>
            DropToGit is free to use and always will be for its core features. If it saved you
            time, you can support ongoing development with a donation below.
          </p>
          <p>
            No account, no subscription — just a direct thank-you.
          </p>
        </div>
      </section>

      {/* Ghana — Mobile Money */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Smartphone className="h-5 w-5 text-sky-accent" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Ghana — Mobile Money
          </h2>
        </div>
        <Card>
          <CardContent className="pt-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                      Network
                    </th>
                    <th className="text-left font-medium py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                      Number
                    </th>
                    <th className="text-left font-medium py-2.5 text-muted-foreground whitespace-nowrap">
                      Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium whitespace-nowrap">MTN MoMo</td>
                    <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">0535343490</td>
                    <td className="py-3 text-muted-foreground whitespace-nowrap">Vivian Ahorlu</td>
                  </tr>
                  <tr className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium whitespace-nowrap">Telecel Cash</td>
                    <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">0209558038</td>
                    <td className="py-3 text-muted-foreground whitespace-nowrap">Bright Dumashie</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* International — Bank Transfer */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">
            International — USD Bank Transfer
          </h2>
        </div>
        <Card>
          <CardContent className="pt-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">Bank</td>
                    <td className="py-3 font-medium whitespace-nowrap">Lead Bank (USA)</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">Beneficiary</td>
                    <td className="py-3 font-medium whitespace-nowrap">Bright Dumashie</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">Account Number</td>
                    <td className="py-3 font-mono text-xs whitespace-nowrap">210633430016</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">Routing Number</td>
                    <td className="py-3 font-mono text-xs whitespace-nowrap">101019644</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">Account Type</td>
                    <td className="py-3 whitespace-nowrap">Checking</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap align-top">Bank Address</td>
                    <td className="py-3 text-muted-foreground whitespace-nowrap">1801 Main St., Kansas City, MO 64108</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap align-top">Beneficiary Address</td>
                    <td className="py-3 text-muted-foreground whitespace-nowrap">Adenta, Pine Street, Accra, 00233, Ghana</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Disclaimer */}
      <section className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Donations are processed manually and are not linked to any account or feature unlock
            — this project remains fully open regardless of donation status.
          </p>
        </div>
      </section>

      {/* Coming soon note */}
      <section>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <p>
            Automated card/mobile checkout coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}
