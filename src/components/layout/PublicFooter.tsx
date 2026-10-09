import { Link } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";

/** Footer for the public pages: the way to everything a visitor might look for. */
export function PublicFooter() {
  return (
    <footer className="w-full border-t border-border mt-12">
      <div className="mx-auto w-full max-w-md px-6 py-8 flex flex-col items-center gap-4">
        <Wordmark className="text-lg" />
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/help" className="hover:text-foreground">Help</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
