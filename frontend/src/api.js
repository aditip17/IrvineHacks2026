import {API_BASE} from "./constants";

export async function fetchHomes(city){
  const q = city ? `?city=${encodeURIComponent(city)}` : "";
  const res=await fetch(`${API_BASE}/homes${q}`);
  if(!res.ok){
    const text=await res.text();
    throw new Error(`GET /homes failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function fetchRankedHomes(_homes,quiet,green,activity,light,city){
  const q = city ? `?city=${encodeURIComponent(city)}` : "";
  const res=await fetch(`${API_BASE}/score${q}`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      w_quiet:quiet,
      w_green:green,
      w_activity:activity,
      w_light:light
    })
  });

  if(!res.ok){
    const text=await res.text();
    throw new Error(`POST /score failed (${res.status}): ${text}`);
  }
  return res.json();
}
