import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import type { Content } from '@elizaos/core';
import { Button } from './ui/button';

interface MessageDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: (Content & { [key: string]: any }) | null;
}

export default function MessageDetailsSheet({ open, onOpenChange, message }: MessageDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[540px] flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Details</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 p-4">
          {message ? (
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(message, null, 2)}
            </pre>
          ) : (
            <div className="text-muted-foreground text-sm">No details available.</div>
          )}
        </ScrollArea>
        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
