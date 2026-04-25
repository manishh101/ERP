import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const actions = ["New Sale", "New Purchase Order", "New Customer", "New Invoice"];

export function QuickActions() {
  

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump into high-frequency workflows with a single click.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Button
            key={action}
            variant="outline"
            className="justify-start rounded-3xl px-5 py-4"
            onClick={() => toast(action, { description: "The workflow is scaffolded and ready for backend wiring." })}
          >
            {action}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

