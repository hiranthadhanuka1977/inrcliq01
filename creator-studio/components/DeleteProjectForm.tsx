"use client";

import { deleteProjectAction } from "../lib/actions";

export default function DeleteProjectForm({ id }: { id: string }) {
  return (
    <form
      action={deleteProjectAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this project? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="admin-btn admin-btn--danger" type="submit">
        Delete project
      </button>
    </form>
  );
}
