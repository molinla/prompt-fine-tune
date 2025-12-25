"use client"

import { CheckIcon } from "lucide-react"
import { ReactNode } from "react"
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import { models } from "../model-data"

export interface ModelSelectorPopoverProps {
  model: string
  onModelChange: (modelId: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
}

const chefs = Array.from(new Set(models.map((m) => m.chef)))

export function ModelSelectorPopover({
  model,
  onModelChange,
  open,
  onOpenChange,
  trigger,
}: ModelSelectorPopoverProps) {
  return (
    <ModelSelector onOpenChange={onOpenChange} open={open}>
      <ModelSelectorTrigger asChild>
        {trigger}
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {chefs.map((chef) => (
            <ModelSelectorGroup heading={chef} key={chef}>
              {models
                .filter((m) => m.chef === chef)
                .map((modelItem) => (
                  <ModelSelectorItem
                    key={modelItem.id}
                    onSelect={() => {
                      onModelChange(modelItem.id)
                      onOpenChange(false)
                    }}
                    value={modelItem.id}
                  >
                    <ModelSelectorLogo provider={modelItem.chefSlug} />
                    <ModelSelectorName>{modelItem.name}</ModelSelectorName>
                    <ModelSelectorLogoGroup>
                      {modelItem.providers.map((provider) => (
                        <ModelSelectorLogo
                          key={provider}
                          provider={provider}
                        />
                      ))}
                    </ModelSelectorLogoGroup>
                    {model === modelItem.id ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}

export function getModelById(modelId: string) {
  return models.find((m) => m.id === modelId) || models[0]
}

export {
  ModelSelectorLogo,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector"
