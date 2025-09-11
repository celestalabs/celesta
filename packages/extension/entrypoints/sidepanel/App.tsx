import React from "react";
import { createRoot } from "react-dom/client";

const App = React.memo(() => {
  return <div>Hello, Celesta!</div>;
});

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
