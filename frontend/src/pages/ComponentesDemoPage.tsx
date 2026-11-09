import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bell, FileText, Table2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable/DataTable';
import type { DataTableColumn } from '@/components/DataTable/types';
import { useDataTableState } from '@/components/DataTable/useDataTableState';
import { ImageUpload } from '@/components/ImageUpload/ImageUpload';
import { RichTextEditor } from '@/components/RichTextEditor/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Fila de demostración: imita un recurso real del backend. */
interface DemoRow {
  id: number;
  codigo: string;
  remitente: string;
  destinatario: string;
  asunto: string;
  fecha: string;
  estado: 'Activo' | 'Inactivo';
}

const REMITENTES = [
  'Municipalidad Provincial',
  'Gobierno Regional',
  'Cámara de Comercio',
  'Universidad UNSA',
  'Ministerio de Energía',
];
const DESTINATARIOS = ['Redacción', 'Gerencia General', 'Archivo Central', 'Notaría 12', 'Dirección de Eventos'];
const ASUNTOS = [
  'Invitación a sesión de cabildo',
  'Solicitud de informe técnico',
  'Oficio de coordinación',
  'Convocatoria a rueda de negocios',
  'Remisión de antecedentes',
];

const DEMO_ROWS: DemoRow[] = Array.from({ length: 57 }, (_, index) => ({
  id: index + 1,
  codigo: `${501 + index}-2026`,
  remitente: REMITENTES[index % REMITENTES.length],
  destinatario: DESTINATARIOS[index % DESTINATARIOS.length],
  asunto: ASUNTOS[index % ASUNTOS.length],
  fecha: `2026-11-${String((index % 28) + 1).padStart(2, '0')}`,
  estado: index % 3 === 0 ? 'Inactivo' : 'Activo',
}));

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Simula el endpoint server-side (`GET /cartas`): filtra, ordena y pagina
 * en memoria respetando el contrato `{ data, meta }` de la API.
 */
async function fetchDemoRows(params: {
  page: number;
  pageSize: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, string>;
}): Promise<{ data: DemoRow[]; meta: { page: number; pageSize: number; total: number } }> {
  await delay(350);

  const activeFilters = Object.entries(params.filters ?? {}).filter(([, value]) => value.trim() !== '');

  let rows = DEMO_ROWS.filter((row) =>
    activeFilters.every(([field, value]) => {
      const needle = value.trim().toLowerCase();
      if (field === 'fecha') {
        return row.fecha === value.trim();
      }
      return String(row[field as keyof DemoRow]).toLowerCase().includes(needle);
    }),
  );

  if (params.sort) {
    const direction = params.order === 'desc' ? -1 : 1;
    const key = params.sort as keyof DemoRow;
    rows = [...rows].sort((a, b) => {
      const left = a[key];
      const right = b[key];
      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction;
      }
      return String(left).localeCompare(String(right), 'es') * direction;
    });
  }

  const total = rows.length;
  const start = (params.page - 1) * params.pageSize;

  return {
    data: rows.slice(start, start + params.pageSize),
    meta: { page: params.page, pageSize: params.pageSize, total },
  };
}

const columns: DataTableColumn<DemoRow>[] = [
  { accessorKey: 'codigo', header: 'Código', filter: { type: 'text', placeholder: '571-2026' } },
  { accessorKey: 'remitente', header: 'Remitente', filter: { type: 'text' } },
  { accessorKey: 'destinatario', header: 'Destinatario', filter: { type: 'text' } },
  { accessorKey: 'asunto', header: 'Asunto', sortable: false, filter: { type: 'text' } },
  { accessorKey: 'fecha', header: 'Fecha', filter: { type: 'date' } },
  {
    accessorKey: 'estado',
    header: 'Estado',
    filter: {
      type: 'select',
      options: [
        { value: 'activo', label: 'Activo' },
        { value: 'inactivo', label: 'Inactivo' },
      ],
    },
  },
];

/**
 * Demostración de los componentes reutilizables de la Fase 2 con datos en
 * memoria (no toca la API real). Ruta: `/demo`.
 */
export default function ComponentesDemoPage() {
  const tableState = useDataTableState({ pageSize: 10 });
  const { page, pageSize, sort, order, filters } = tableState;

  const listQuery = useQuery({
    queryKey: ['demo-datatable', { page, pageSize, sort, order, filters }],
    queryFn: () => fetchDemoRows({ page, pageSize, sort, order, filters }),
    placeholderData: keepPreviousData,
  });

  const [html, setHtml] = useState('<p>Este es el <strong>cuerpo</strong> de la noticia. Use la barra de herramientas para dar formato.</p>');
  const [imagen, setImagen] = useState<File | null>(null);

  const errorMessage = listQuery.error
    ? listQuery.error instanceof Error
      ? listQuery.error.message
      : 'No se pudieron cargar los datos.'
    : null;

  /** Falso uploader: reemplazar por `POST /api/v1/uploads/editor` (Fase 3). */
  const handleDemoUpload = async (file: File) => {
    await delay(400);
    return URL.createObjectURL(file);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Componentes reutilizables</h1>
        <p className="text-sm text-muted-foreground">
          Demostración de la Fase 2 con datos en memoria (no usa la API real). Los módulos reales usarán estos mismos
          componentes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5" aria-hidden="true" />
            DataTable server-side
          </CardTitle>
          <CardDescription>
            Orden por cabecera (asc → desc → sin orden), filtros por columna con debounce de 300 ms, skeletons,
            estado vacío y paginación. Así se comportará contra la API real.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={listQuery.data?.data ?? []}
            meta={listQuery.data?.meta}
            state={tableState}
            isLoading={listQuery.isLoading}
            isFetching={listQuery.isFetching}
            error={errorMessage}
            onRetry={() => listQuery.refetch()}
            emptyMessage="No hay cartas que coincidan con los filtros."
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" aria-hidden="true" />
              RichTextEditor (TipTap)
            </CardTitle>
            <CardDescription>
              Produce solo etiquetas de la lista blanca; el backend lo sanitiza al guardar. Inserte imágenes con el
              botón de la barra.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RichTextEditor value={html} onChange={setHtml} onImageUpload={handleDemoUpload} />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">HTML generado (lo que guarda la API):</p>
              <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">{html}</pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" aria-hidden="true" />
              ImageUpload y toasts
            </CardTitle>
            <CardDescription>
              Selector de imagen con vista previa, validación de formato/tamaño (JPG, PNG, WebP; 10 MB) y quita. Los
              toasts están disponibles para los mensajes de éxito/error.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload value={imagen} onChange={setImagen} />

            {imagen && (
              <p className="text-sm text-muted-foreground">
                Archivo seleccionado: <span className="font-medium text-foreground">{imagen.name}</span> (
                {(imagen.size / 1024).toFixed(1)} KB)
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                toast.success('Operación realizada', { description: 'Así se muestran los toasts del sistema.' })
              }
            >
              Probar toast
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
