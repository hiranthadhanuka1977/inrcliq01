export default function LoadError({ title, message }: { title: string; message: string }) {
  return (
    <div className="admin-pagehead">
      <div>
        <p className="admin-kicker">Seller Tools</p>
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}
