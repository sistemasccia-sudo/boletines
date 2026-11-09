import { ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TIPOS_NOTICIA } from '@/features/noticias/schema';
import { useIntercambiarOrden, useOrdenDelDia } from '@/features/orden-noticias/hooks';
import { getApiErrorMessage } from '@/lib/api';

/**
 * «Cambiar orden de noticias»: filtra por tipo (por defecto Local) y, al
 * seleccionar dos noticias y pulsar «Intercambiar», troca su posición
 * (intercambio transaccional en backend).
 */
export default function OrdenNoticiasPage() {
  // Filtro de tipo con valor por defecto: 1 = Local.
  const [tipo, setTipo] = useState('1');
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const ordenQuery = useOrdenDelDia(tipo);
  const swapMutation = useIntercambiarOrden(tipo);

  const noticias = ordenQuery.data?.data ?? [];
  const fecha = ordenQuery.data?.fecha;
  const seleccionadas = seleccion.length;
  const puedeIntercambiar = seleccionadas === 2 && !swapMutation.isPending;

  const cambiarTipo = (nuevoTipo: string) => {
    setTipo(nuevoTipo);
    setSeleccion([]); // La selección no cruza filtros.
  };

  const toggle = (id: number) => {
    // Máximo dos seleccionadas (se evita el updater con efectos: React los duplica en dev).
    if (!seleccion.includes(id) && seleccion.length >= 2) {
      toast.info('Solo puede seleccionar dos noticias.');
      return;
    }
    setSeleccion((actual) =>
      actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id],
    );
  };

  const handleIntercambiar = async () => {
    const [primera, segunda] = seleccion;
    if (primera === undefined || segunda === undefined) {
      return;
    }
    try {
      await swapMutation.mutateAsync([primera, segunda]);
      setSeleccion([]);
      toast.success('Orden intercambiado correctamente.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar orden de noticias</CardTitle>
        <CardDescription>
          Seleccione dos noticias del día y pulse «Intercambiar» para trocar su posición.
          {fecha ? ` Noticias del ${fecha}.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="orden-tipo" className="whitespace-nowrap">
            Tipo
          </Label>
          <Select
            id="orden-tipo"
            value={tipo}
            disabled={swapMutation.isPending}
            onChange={(event) => cambiarTipo(event.target.value)}
            className="w-56"
          >
            {TIPOS_NOTICIA.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </Select>
        </div>

        {ordenQuery.isLoading && (
          <div className="space-y-2" aria-label="Cargando noticias del día">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {ordenQuery.isError && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-destructive" role="alert">
            <span>{getApiErrorMessage(ordenQuery.error)}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => ordenQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {!ordenQuery.isLoading && !ordenQuery.isError && noticias.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay noticias de este tipo el día para ordenar.
          </p>
        )}

        {noticias.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-12 px-3 py-2 text-left font-medium text-muted-foreground">
                    <span className="sr-only">Seleccionar</span>
                  </th>
                  <th className="w-20 px-3 py-2 text-left font-medium text-muted-foreground">
                    Orden
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Titular
                  </th>
                </tr>
              </thead>
              <tbody>
                {noticias.map((noticia) => (
                  <tr
                    key={noticia.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={seleccion.includes(noticia.id)}
                        onChange={() => toggle(noticia.id)}
                        aria-label={`Seleccionar: ${noticia.titulo}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{noticia.orden}</td>
                    <td className="px-3 py-2">{noticia.titulo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {seleccionadas > 0
              ? `Seleccionadas: ${seleccionadas} de 2.`
              : 'Marque dos noticias para activar el intercambio.'}
          </p>
          <Button type="button" disabled={!puedeIntercambiar} onClick={handleIntercambiar}>
            <ArrowLeftRight className="mr-2 h-4 w-4" aria-hidden="true" />
            Intercambiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
