import { createRoot } from "react-dom/client";
import { App } from "./app";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

const container = document.getElementById("root");

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {},
    mutations: {
      onError: (error) =>
        toast({
          title: error.name,
          description: error.message,
          variant: "destructive",
        }),
    },
  },
});

if (container) {
  const root = createRoot(container);

  root.render(<Init />);
}

function Init() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider delayDuration={0}>
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
