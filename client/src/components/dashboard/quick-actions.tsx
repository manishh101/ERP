import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ShoppingCart, Users, FileText } from "lucide-react";

const actions = [
  { name: "New Sale", icon: ShoppingCart },
  { name: "New Purchase Order", icon: PlusCircle },
  { name: "New Customer", icon: Users },
  { name: "New Invoice", icon: FileText }
];

export function QuickActions() {
  return (
    <Card className="flex-1 bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>High-frequency workflow shortcuts.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {actions.map((action) => (
          <Button
            key={action.name}
            variant="outline"
            className="group relative justify-start rounded-2xl px-5 py-5 h-auto overflow-hidden bg-white/40 hover:bg-white/60 border-white/40 border shadow-none transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5"
            onClick={() => toast(action.name, { description: "The workflow is scaffolded and ready for backend wiring." })}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <action.icon className="w-5 h-5 mr-3 text-primary/70 group-hover:text-primary transition-colors" />
            <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.name}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

