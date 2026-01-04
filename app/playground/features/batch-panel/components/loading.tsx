import { Skeleton } from "@/components/ui/skeleton"

export function BatchPanelSkeleton() {
  return (
    <div className="@container/cards flex flex-col h-full gap-4 p-4 overflow-y-auto">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center flex-col gap-4 @md/cards:flex-row">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid @md/cards:grid-cols-2 @2xl/cards:grid-cols-3 @4xl/cards:grid-cols-4 @7xl/cards:grid-cols-5 grid-cols-1 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col border rounded-lg p-3 bg-card min-h-[250px] gap-4"
          >
            <div className="flex justify-between items-start">
              <Skeleton className="h-5 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
              <div className="mt-auto flex gap-1">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-5 w-5 rounded-md" />
              </div>
            </div>

            <div className="pt-2 border-t border-dashed flex flex-col gap-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-4 rounded-md" />
              </div>
              <Skeleton className="h-[60px] w-full" />
            </div>
          </div>
        ))}
        {/* Add Button Skeleton */}
        <div className="flex flex-col justify-center items-center border border-dashed rounded-lg p-3 bg-muted/20 min-h-[250px]">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  )
}
