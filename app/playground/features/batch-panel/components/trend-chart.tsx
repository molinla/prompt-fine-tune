import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { Area, AreaChart, YAxis } from "recharts"
import { HistoryItem } from "../types"

const chartConfig = {
  successRate: {
    label: "Success Rate",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface TrendChartProps {
  history: HistoryItem[]
  id: string
}

export function TrendChart({ history, id }: TrendChartProps) {
  if (history.length === 0) {
    return (
      <div className="h-12 w-full bg-muted/20 rounded-sm flex items-center justify-center text-[10px] text-muted-foreground">
        No history
      </div>
    )
  }

  const data = history.slice(-20).map((h, i) => ({
    index: i,
    successRate: h.successRate,
    timestamp: h.timestamp,
  }))

  if (data.length === 1) {
    data.push({
      index: data[0].index + 1,
      successRate: data[0].successRate,
      timestamp: data[0].timestamp,
    })
  }

  // Calculate average for dynamic color
  const avgRate = data.reduce((a, b) => a + b.successRate, 0) / data.length
  const color = avgRate >= 90 ? '#22c55e' : avgRate >= 50 ? '#eab308' : '#ef4444'

  const gradientId = `fillSuccessRate-${id}`

  return (
    <ChartContainer config={chartConfig} className="h-12 w-full">
      <AreaChart
        data={data}
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity="0.3" />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={[0, 100]} hide />
        <Area
          type="monotone"
          dataKey="successRate"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
