import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "../../lib/utils";

const ResizablePanelGroup = Group;
const ResizablePanel = Panel;

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentPropsWithoutRef<typeof Separator>
>(({ className, ...props }, ref) => (
  <Separator
    elementRef={ref}
    className={cn("layout-resize-handle", className)}
    {...props}
  />
));
ResizableHandle.displayName = "ResizableHandle";

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
