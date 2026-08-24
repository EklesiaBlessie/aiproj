import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

export default function Plans() {
  const handlePlanClick = (planName: string) => {
    toast.info(`This is a demo — billing isn't connected yet.`);
  };

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      description: 'Core product management features',
      badge: 'Active Plan',
      features: [
        'Dashboard & Metrics visualization',
        'Feedback Ingestion pipeline',
        'Basic customer feedback themes',
        'Prioritization matrix (RICE/ICE/MoSCoW)',
        'Roadmap board with drag-and-drop',
        'Product requirements document (PRD) generator',
        'Ask Copilot (casual Q&A / simple RAG)',
      ],
      buttonText: 'Current Plan',
      buttonVariant: 'outline' as const,
    },
    {
      name: 'Pro',
      price: '$29/mo',
      description: 'Advanced features for scaling PMs',
      badge: 'Popular',
      features: [
        'Everything in Free',
        'Feature Requests aggregation',
        'Advanced analytics exports (PDF/CSV)',
        'Priority AI Copilot access',
        'Team roadmap sharing & collaboration',
        'Unlimited AI PRD generations',
      ],
      buttonText: 'Upgrade to Pro',
      buttonVariant: 'default' as const,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'Enterprise grade security & governance',
      badge: 'Scale',
      features: [
        'Everything in Pro',
        'Single Sign-On (SSO)',
        'Detailed audit logs & compliance tracking',
        'Dedicated support engineer',
        'Custom integrations with Jira/Linear',
        'SLA & high availability uptime guarantees',
      ],
      buttonText: 'Contact Sales',
      buttonVariant: 'secondary' as const,
    },
  ];

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Pricing & Plans</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Choose the best plan to power your product management workflow with AI-driven insights and RAG prioritization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {tiers.map((tier) => (
          <Card key={tier.name} className="flex flex-col relative h-full">
            {tier.badge && (
              <Badge className="absolute top-4 right-4" variant={tier.name === 'Pro' ? 'default' : 'secondary'}>
                {tier.badge}
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
              <CardDescription className="min-h-[40px] mt-2">
                {tier.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                  {tier.price !== 'Custom' && <span className="text-muted-foreground ml-1">/month</span>}
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className="w-full mt-auto"
                variant={tier.buttonVariant}
                onClick={() => handlePlanClick(tier.name)}
              >
                {tier.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
