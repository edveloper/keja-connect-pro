import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/Wordmark";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.warn("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Wordmark className="text-xl mb-8" />
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">This page doesn't exist</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        The link may be out of date, or the address mistyped.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to your dashboard</Link>
      </Button>
    </div>
  );
}
