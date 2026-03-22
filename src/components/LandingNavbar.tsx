import { Link } from "react-router-dom";
import { Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";

const LandingNavbar = () => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <Satellite className="h-5 w-5 text-primary transition-transform group-hover:rotate-12" />
            <span className="text-base font-bold tracking-widest uppercase text-foreground">
              OutSights
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-5 ml-4">
            <button
              onClick={() => scrollTo("solutions")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Solutions
            </button>
            <button
              onClick={() => scrollTo("about")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </button>
            <Link
              to="/platform"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Platform Demo
            </Link>
          </div>
        </div>
        <Button
          onClick={() => scrollTo("cta")}
          size="sm"
          className="bg-primary text-primary-foreground font-semibold tracking-wide hover:glow-cyan transition-all duration-300"
        >
          Join Waitlist
        </Button>
      </div>
    </nav>
  );
};

export default LandingNavbar;
