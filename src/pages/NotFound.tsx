import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/Wordmark";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.warn("404:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Page not found | RentKonnect</title>
        <meta name="description" content="This page doesn't exist on RentKonnect." />
      </Helmet>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <Wordmark className="text-xl mb-8" />
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">This page doesn't exist</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          The link may be out of date, or the address mistyped.
        </p>
        <Button asChild className="mt-6">
          {/* Signed in this is the dashboard; signed out, the home page. */}
          <Link to="/">Back to the home page</Link>
        </Button>
      </div>
    </>
  );
}
