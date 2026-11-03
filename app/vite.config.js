import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        englishCalendar: fileURLToPath(new URL("./en/calendar.html", import.meta.url)),
      },
    },
  },
});
