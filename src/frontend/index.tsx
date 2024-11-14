import { createRoot } from "react-dom/client";
import { App } from "./app";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  const queryClient = new QueryClient();

  root.render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
