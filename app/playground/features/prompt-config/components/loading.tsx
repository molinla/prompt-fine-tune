import { Skeleton } from "@/components/ui/skeleton"

export function PromptConfigSkeleton() {
  return (
    <div className="relative flex flex-col h-full p-4 border-r gap-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-20" />
      </div>

      {/* Configuration Controls Skeleton */}
      <div className="flex flex-col gap-4">
        {/* Model Selector Skeleton */}
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* History Turns Skeleton */}
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>

        {/* Temperature Skeleton */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-5 w-full" />
        </div>

        {/* Top P Skeleton */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-5 w-full" />
        </div>
      </div>

      {/* System Prompt Skeleton */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="flex-1 w-full" />
      </div>
    </div>
  )
}
