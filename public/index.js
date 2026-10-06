const $ = (id) => document.getElementById(id);

async function load() {
  const me = await fetch("/api/me");
  if (me.status === 401) {
    $("who").hidden = false;
    $("mine").hidden = true;
    return;
  }
  const actor = await me.json();
  $("who").hidden = true;
  $("mine").hidden = false;
  $("hello").textContent = `You're planning as ${actor.name}.`;
  const events = await (await fetch("/api/events")).json();
  $("events").replaceChildren(
    ...events.map((e) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `/events/${e.id}`;
      a.textContent = e.name;
      li.append(a, ` — ${e.role}`);
      return li;
    }),
  );
}

$("name-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: $("name").value }),
  });
  if (!res.ok) {
    $("name-error").textContent = (await res.json()).message;
    $("name-error").hidden = false;
    return;
  }
  const next = new URLSearchParams(location.search).get("next");
  if (next && next.startsWith("/events/")) location.href = next;
  else load();
});

$("create").addEventListener("click", async () => {
  $("create").disabled = true;
  const res = await fetch("/api/events", { method: "POST" });
  const { id } = await res.json();
  location.href = `/events/${id}`;
});

load();
