import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";

const App = React.memo(() => {
  return (
    <div>
      <div className="text-xl">Hello user</div>
    </div>
  );
});

createRoot(document.getElementById("root")!).render(<App />);
