import type { LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AgentCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

export function AgentCard({ title, description, icon: Icon, children, className }: AgentCardProps) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <Icon className="h-10 w-10 text-primary" />
        <div>
          <CardTitle className="font-headline text-2xl">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {children}
      </CardContent>
    </Card>
  );
}
