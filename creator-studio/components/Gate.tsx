import { mainOrigin } from "../lib/media";

export default function Gate({ reason }: { reason?: string }) {
  const home = mainOrigin();
  return (
    <main className="admin-unlock">
      <section className="admin-unlock__card">
        <span className="admin-brand__mark">Iq</span>
        <p className="admin-kicker">Creator Studio</p>
        <h1>{reason ? "Studio is locked" : "Open it from InrCliq"}</h1>
        <p>
          {reason ??
            "Use Creator Studio in the InrCliq left menu while you are signed in. That opens this app and signs you in."}
        </p>
        <a className="admin-btn" href={reason ? `${home}/seller` : `${home}/feed`}>
          {reason ? "Go to Seller Tools" : "Back to InrCliq"}
        </a>
      </section>
    </main>
  );
}
