import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Users, Receipt } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="max-w-4xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Panel de Control Financiero
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Gestiona tus ingresos, rastrea gastos, maneja declaraciones de IVA y mantén registros de clientes en un solo lugar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
          <div className="p-6 rounded-lg border bg-card">
            <BarChart3 className="h-8 w-8 mb-2 mx-auto text-primary" />
            <h3 className="font-semibold mb-1">Seguimiento Financiero</h3>
            <p className="text-sm text-muted-foreground">Monitorea ingresos y gastos</p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <Users className="h-8 w-8 mb-2 mx-auto text-primary" />
            <h3 className="font-semibold mb-1">Gestión de Clientes</h3>
            <p className="text-sm text-muted-foreground">Mantén organizados tus registros de clientes</p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <Receipt className="h-8 w-8 mb-2 mx-auto text-primary" />
            <h3 className="font-semibold mb-1">Declaraciones de IVA</h3>
            <p className="text-sm text-muted-foreground">Cálculos fiscales simplificados</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Comenzar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
