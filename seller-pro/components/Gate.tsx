import { mainOrigin } from "../lib/main";

export default function Gate() {
  const home = mainOrigin();
  return (
    <main className="admin-unlock">
      <section className="admin-unlock__card">
        <span className="admin-brand__mark">Iq</span>
        <p className="admin-kicker">Seller Tools</p>
        <h1>Open it from InrCliq</h1>
        <p>
          Use ST v2.0 on Collection or Service requests while you are signed in. That opens this
          app and signs you in.
        </p>
        <a className="admin-btn" href={`${home}/seller`}>
          Back to Seller Tools
        </a>
      </section>
    </main>
  );
}
