"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/hooks/use-theme";
import { IconButton } from "@/components/ui/IconButton";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <IconButton
      label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      onClick={toggleTheme}
    >
      {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
    </IconButton>
  );
}
