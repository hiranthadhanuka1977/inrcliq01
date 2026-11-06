import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import { listVideoLibrary, studioShapeLabel } from "@/lib/studio/library";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const projects = await listVideoLibrary(user.id, user.ageZone);

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-content">
        <div className="content-layout">
          <main className="video-library">
            <header className="video-library__header">
              <div>
                <p className="video-library__eyebrow">Videos</p>
                <h1 className="video-library__title">Watch and listen</h1>
                <p className="video-library__lede">
                  Films, series, talks, lessons, podcasts, audiobooks, music, sound, shorts, and promos from Creator Studio.
                </p>
              </div>
            </header>
            {projects.length === 0 ? (
              <p className="video-library__lede">Nothing is published here yet.</p>
            ) : (
              <div className="video-library__grid">
                {projects.map((project) => (
                  <a key={project.id} className="video-card" href={`/feed/videos/${project.id}`}>
                    <span
                      className="video-card__media"
                      style={
                        project.thumbnailUrl
                          ? { backgroundImage: `url("${project.thumbnailUrl.replace(/"/g, "")}")` }
                          : undefined
                      }
                    />
                    <span className="video-card__body">
                      <span className="video-card__kicker">
                        {studioShapeLabel(project.shape)}
                        {project.show ? ` · ${project.show.title}` : ""}
                      </span>
                      <span className="video-card__title">{project.title || "Untitled"}</span>
                      <span>{project.creator.name}</span>
                    </span>
                  </a>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
