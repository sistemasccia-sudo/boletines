import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de página completa (estado de carga inicial). */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    </div>
  );
}
