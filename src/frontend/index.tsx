import { createRoot } from "react-dom/client";
import { App } from "./app";
import { ThemeProvider } from "@/components/theme/theme-provider";

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  );
}
