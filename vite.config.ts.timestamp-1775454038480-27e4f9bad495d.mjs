// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  build: {
    // Source maps: enabled in staging for easier debugging, disabled in production
    sourcemap: mode === "staging",
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Split vendor chunks for better browser cache hit rates across deploys
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": ["lucide-react"]
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  server: {
    // In dev, proxy /api calls to the Spring Boot backend — avoids local CORS config
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:8080",
        changeOrigin: true,
        secure: false
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwidml0ZXN0XCIgLz5cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuXG4gIHRlc3Q6IHtcbiAgICBlbnZpcm9ubWVudDogJ25vZGUnLFxuICAgIGluY2x1ZGU6IFsnc3JjLyoqLyoudGVzdC50cyddLFxuICB9LFxuXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG5cbiAgYnVpbGQ6IHtcbiAgICAvLyBTb3VyY2UgbWFwczogZW5hYmxlZCBpbiBzdGFnaW5nIGZvciBlYXNpZXIgZGVidWdnaW5nLCBkaXNhYmxlZCBpbiBwcm9kdWN0aW9uXG4gICAgc291cmNlbWFwOiBtb2RlID09PSAnc3RhZ2luZycsXG5cbiAgICBhc3NldHNJbmxpbmVMaW1pdDogNDA5NixcblxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICAvLyBTcGxpdCB2ZW5kb3IgY2h1bmtzIGZvciBiZXR0ZXIgYnJvd3NlciBjYWNoZSBoaXQgcmF0ZXMgYWNyb3NzIGRlcGxveXNcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3ZlbmRvci1yZWFjdCc6ICAgIFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAndmVuZG9yLXN1cGFiYXNlJzogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXSxcbiAgICAgICAgICAndmVuZG9yLXVpJzogICAgICAgWydsdWNpZGUtcmVhY3QnXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNjAwLFxuICB9LFxuXG4gIHNlcnZlcjoge1xuICAgIC8vIEluIGRldiwgcHJveHkgL2FwaSBjYWxscyB0byB0aGUgU3ByaW5nIEJvb3QgYmFja2VuZCBcdTIwMTQgYXZvaWRzIGxvY2FsIENPUlMgY29uZmlnXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfQVBJX0JBU0VfVVJMID8/ICdodHRwOi8vbG9jYWxob3N0OjgwODAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUlsQixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUVqQixNQUFNO0FBQUEsSUFDSixhQUFhO0FBQUEsSUFDYixTQUFTLENBQUMsa0JBQWtCO0FBQUEsRUFDOUI7QUFBQSxFQUVBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUVBLE9BQU87QUFBQTtBQUFBLElBRUwsV0FBVyxTQUFTO0FBQUEsSUFFcEIsbUJBQW1CO0FBQUEsSUFFbkIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBO0FBQUEsUUFFTixjQUFjO0FBQUEsVUFDWixnQkFBbUIsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDNUQsbUJBQW1CLENBQUMsdUJBQXVCO0FBQUEsVUFDM0MsYUFBbUIsQ0FBQyxjQUFjO0FBQUEsUUFDcEM7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBRUEsdUJBQXVCO0FBQUEsRUFDekI7QUFBQSxFQUVBLFFBQVE7QUFBQTtBQUFBLElBRU4sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUSxRQUFRLElBQUkscUJBQXFCO0FBQUEsUUFDekMsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
