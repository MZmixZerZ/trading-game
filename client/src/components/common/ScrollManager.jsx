// components/ScrollManager.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const noScrollRoutes = [
      "/login",
      "/register",
      "/account",
      "/portfolio",
      "/activity",
    ];

    if (noScrollRoutes.includes(location.pathname)) {
      document.body.style.overflowY = "hidden";
    } else {
      document.body.style.overflowY = "";
    }

    return () => {
      document.body.style.overflowY = "";
    };
  }, [location.pathname]);

  return null;
}
