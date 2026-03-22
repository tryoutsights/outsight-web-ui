import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Building2, BarChart3, MapPin, Satellite, Eye, Users, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const solutions = [
  {
    icon: MapPin,
    title: "Site Selection",
    description: "Identify optimal locations for development using high-resolution satellite data and geospatial analytics.",
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=400&fit=crop",
  },
  {
    icon: Building2,
    title: "Project Monitoring",
    description: "Track construction progress from space with automated change detection and milestone reporting.",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop",
  },
  {
    icon: BarChart3,
    title: "Market Analysis",
    description: "Leverage satellite-derived insights to assess market trends, land use patterns, and regional growth.",
    image: "https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=600&h=400&fit=crop",
  },
];

const founders = [
  {
    name: "Rajneesh Malviya",
    role: "CEO",
    initials: "RM",
    quote: "Scaling high-throughput distributed systems to solve real-world infrastructure challenges.",
    experience: "Ex-Amazon Software Engineer | IIT Guwahati Alum",
    linkedin: "https://www.linkedin.com/in/rajneesh04/",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop",
  },
  {
    name: "Bhasker Goel",
    role: "CTO",
    initials: "BG",
    quote: "Building autonomous AI agents to drive intelligent, scalable Earth observation.",
    experience: "Ex-Google & Ex-D.E. Shaw Software Engineer | IIT Guwahati Alum",
    linkedin: "https://www.linkedin.com/in/bhasker-goel/",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop",
  },
];

const Landing = () => {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    toast.success("Thank you! We'll be in touch soon.");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary tracking-wider uppercase">
                <Satellite className="h-3.5 w-3.5" />
                Geospatial Data for Real Estate
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground">
                Analyze sites & track construction{" "}
                <span className="text-primary">from space.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                OutSights delivers satellite imagery and geospatial intelligence to help real estate and construction teams make faster, data-driven decisions.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  onClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-primary text-primary-foreground font-semibold tracking-wide hover:glow-cyan transition-all duration-300 hover:scale-[1.02]"
                >
                  Request a Pilot
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="border-border/50 hover:border-primary/50 hover:text-primary transition-all duration-300"
                >
                  <Link to="/platform">View Demo Image</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-border/30 glow-cyan-sm">
                <img
                  src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop"
                  alt="Aerial view of a construction site"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute bottom-4 left-4 glass rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">Site Status</p>
                  <p className="text-[10px] text-muted-foreground">Active Development</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section id="vision" className="py-20 md:py-28 bg-card/50 border-y border-border/20">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary tracking-wider uppercase mb-8">
            <Eye className="h-3.5 w-3.5" />
            Our Vision
          </div>
          <blockquote className="text-xl md:text-2xl font-bold leading-snug tracking-tight text-foreground italic">
            "Our vision is to build the definitive remote truth layer for Earth observation, starting with India's infrastructure boom."
          </blockquote>
          <p className="mt-8 text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We envision a world where physical progress is as transparent, trackable, and verifiable as digital data. Our North Star is to transform raw satellite imagery into unfalsifiable, real-time insights that eliminate the "Trust Gap" in global construction. By providing developers, stakeholders, and enterprises with the absolute ground truth of any physical asset, we empower them to drive decisions and monitor project health based on objective, AI-driven certainty rather than vulnerable manual reporting.
          </p>
        </div>
      </section>

      {/* Industry Solutions */}
      <section id="solutions" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary tracking-wider uppercase mb-6">
              <BarChart3 className="h-3.5 w-3.5" />
              Solutions
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Built for Real Estate & Construction
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Purpose-built solutions powered by satellite imagery and geospatial intelligence.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {solutions.map((s) => (
              <div
                key={s.title}
                className="group relative rounded-xl border border-border/30 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={s.image}
                    alt={s.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="relative p-6 pt-8">
                  <div className="absolute -top-5 left-6 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-20 md:py-28 bg-card/50 border-y border-border/20">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary tracking-wider uppercase mb-6">
              <Users className="h-3.5 w-3.5" />
              About Us
            </div>
            <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              OutSights was founded to solve the critical "Trust Gap" and multi-million dollar "leakage" in the construction and infrastructure sectors, where developers frequently lose capital to falsified progress reports. Built on an 8-year collaborative engineering history in robotics and deep-tech, we provide an unfalsifiable, remote truth layer for physical assets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {founders.map((f) => (
              <div
                key={f.name}
                className="group relative rounded-xl border border-border/30 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
              >
                <div className="h-72 overflow-hidden">
                  <img
                    src={f.image}
                    alt={f.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="relative p-6 pt-8">
                  <div className="absolute -top-5 left-6 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center backdrop-blur-sm text-primary font-bold text-sm">
                    {f.initials}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{f.name}</h3>
                  <p className="text-sm text-primary font-medium mb-3">{f.role}</p>
                  <p className="text-sm text-muted-foreground italic mb-3 leading-relaxed">
                    "{f.quote}"
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">{f.experience}</p>
                  <a
                    href={f.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    Connect on LinkedIn
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section id="cta" className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Drive sustainable growth.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Join our pilot program and get early access to satellite-powered geospatial analytics for your next project.
          </p>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-card border-border/50 shadow-inner focus:border-primary focus:ring-primary"
            />
            <Button
              type="submit"
              className="bg-primary text-primary-foreground font-semibold tracking-wide hover:glow-cyan transition-all duration-300 shrink-0"
            >
              Request Access
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Satellite className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold tracking-widest uppercase text-foreground">OutSights</span>
              <span className="text-xs text-muted-foreground ml-2">Geospatial Intelligence</span>
            </div>
            <button
              onClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact Us
            </button>
          </div>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} OutSights. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
