import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, FileText, PackagePlus, ReceiptText, ShoppingCart, Users } from "lucide-react";

const actions = [
  { name: "New Sale", description: "Create and track a customer order", href: "/sales", icon: ShoppingCart },
  { name: "Purchase Order", description: "Restock materials from suppliers", href: "/purchasing", icon: PackagePlus },
  { name: "Party Ledger", description: "Review dues and customer activity", href: "/parties", icon: Users },
  { name: "Invoice Desk", description: "Bill, collect, and reconcile", href: "/invoicing", icon: FileText },
  { name: "Payments", description: "Record receipts and settlements", href: "/payments", icon: ReceiptText },
];

export function QuickActions() {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Open the workspaces your team reaches for most.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2.5">
        {actions.map((action) => (
          <Link
            key={action.name}
            to={action.href}
            className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3.5 py-3 text-left transition hover:border-primary/30 hover:bg-secondary/50 hover:shadow-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
              <action.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{action.name}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{action.description}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
