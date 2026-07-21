import { Cursor } from "@/components/cursor";
import { NavBar } from "@/components/nav-bar";
import { HomeStage } from "@/components/home-stage";
import { AboutSection, NewsSection, SiteFooter } from "@/components/sections";

export default function Home() {
  return (
    <div id="top" className="relative">
      <div className="noise-overlay" aria-hidden />
      <Cursor />
      <NavBar />
      <main>
        <HomeStage />
        <NewsSection />
        <AboutSection />
      </main>
      <SiteFooter />
    </div>
  );
}
