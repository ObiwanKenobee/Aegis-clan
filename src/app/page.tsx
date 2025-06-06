import { Header } from '@/components/layout/Header';
import { AgentCard } from '@/components/AgentCard';
import { AncestryManager } from '@/components/features/AncestryManager';
import { DisputeMediator } from '@/components/features/DisputeMediator';
import { FaithAdvisor } from '@/components/features/FaithAdvisor';
import { UsersRound, Scale, Landmark, ScrollText, CalendarCheck, Globe, BookHeart, Workflow } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="mb-12 text-center">
          <h2 className="text-4xl font-headline font-bold text-foreground mb-4">Welcome to the AEGIS Covenant System</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            A platform for clan-based communities to manage governance, preserve heritage, and foster unity through multi-agent orchestration.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AgentCard
            title="Ancestry Agent"
            description="Builds and updates family trees from structured data. Preserves your clan's lineage for future generations."
            icon={UsersRound}
          >
            <AncestryManager />
          </AgentCard>

          <AgentCard
            title="Dispute Agent"
            description="Mediates disputes by collecting testimonies and suggesting peaceful resolution paths, guided by Faith Agent insights."
            icon={Scale}
          >
            <DisputeMediator />
          </AgentCard>

          <AgentCard
            title="Faith Agent"
            description="Offers scriptural references and traditional wisdom related to important decisions and clan matters."
            icon={BookHeart}
          >
            <FaithAdvisor />
          </AgentCard>

          <AgentCard
            title="Vault Agent"
            description="Monitors shared community savings, tracks usage, and provides forecasts to ensure financial stability."
            icon={Landmark}
          >
            <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
              <Workflow size={32} className="mx-auto mb-2" />
              <p className="text-sm">Vault monitoring and forecasting tools coming soon.</p>
              <p className="text-xs mt-1">Currently displays static data for demonstration.</p>
              <div className="mt-4 p-3 bg-muted/50 rounded">
                <p className="text-sm font-semibold">Current Balance: $12,500</p>
                <p className="text-xs">Next Projection: +$500 (Month End)</p>
              </div>
            </div>
          </AgentCard>

          <AgentCard
            title="Covenant Agent"
            description="Interprets the clan's moral rule tree (JSON config) and flags potential conflicts for elder review."
            icon={ScrollText}
          >
             <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
              <Workflow size={32} className="mx-auto mb-2" />
              <p className="text-sm">Moral rule interpretation and conflict flagging features are under development.</p>
               <p className="text-xs mt-1"> Elders can manage the ethics JSON externally for now.</p>
            </div>
          </AgentCard>

          <AgentCard
            title="Rite Agent"
            description="Schedules and logs important spiritual rites of passage such as births, marriages, and funerals."
            icon={CalendarCheck}
          >
            <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
              <Workflow size={32} className="mx-auto mb-2" />
              <p className="text-sm">Rite scheduling and logging system is being built.</p>
               <p className="text-xs mt-1">Includes support for audio log links.</p>
            </div>
          </AgentCard>
          
          <AgentCard
            title="Diaspora Agent"
            description="Sends key updates, announcements, and event notifications to remote clan members via Firebase."
            icon={Globe}
            className="md:col-span-2 lg:col-span-1" 
          >
            <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
              <Workflow size={32} className="mx-auto mb-2" />
              <p className="text-sm">Communication tools for diaspora members are in progress.</p>
               <p className="text-xs mt-1">Utilizes Firebase for reliable notifications.</p>
            </div>
          </AgentCard>
        </div>
      </main>
      <footer className="py-6 text-center border-t border-border/50 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Covenant Keeper. All rights reserved.</p>
        <p>Built for trust, heritage, and community.</p>
      </footer>
    </div>
  );
}
