import { cookies } from "next/headers"
import PromptPlayground from "./prompt-playground"
import { Layout } from "react-resizable-panels"

export default async function Page() {
  const cookieStore = await cookies()
  const layout = cookieStore.get("react-resizable-panels:layout")

  let defaultLayout: Layout | undefined = undefined
  if (layout) {
    defaultLayout = JSON.parse(layout.value)
    console.log('server defaultLayout', defaultLayout)
  }

  return (
    <PromptPlayground defaultLayout={defaultLayout} />
  )
}
