import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LEVEL_HIERARCHY = ["A", "B1", "B2", "C1", "C2", "C3", "D"];

function formatLevelBadge(minLevel?: string | null, maxLevel?: string | null, skillLevel?: number): string {
  if (!minLevel && !maxLevel) {
    if (skillLevel != null) {
      return ["D", "C", "B", "A"][skillLevel - 1] ?? `${skillLevel}`;
    }
    return "";
  }
  const min = minLevel || "D";
  const max = maxLevel || "A";
  if (min === max) return min;
  if (max === "B1" && min === "B2") return "B";
  if (max === "C1" && min === "C3") return "C";
  return `${max} – ${min}`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const gameId = url.searchParams.get('game_id')
  const slug = url.searchParams.get('slug')

  if (!gameId && !slug) {
    return new Response('Missing game_id or slug', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let query = supabase
    .from('games')
    .select('id, title, location, date_time, max_players, host_id, host_is_playing, format, slug, prefilled_players, min_level, max_level, skill_level')

  if (slug) {
    query = query.eq('slug', slug)
  } else {
    query = query.eq('id', gameId!)
  }

  const { data: game } = await query.single()

  if (!game) {
    return new Response('Game not found', { status: 404 })
  }

  const { data: host } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', game.host_id)
    .single()

  const { count } = await supabase
    .from('game_players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id)

  // Total = registered players + prefilled guests + host (if playing)
  const prefilledCount = Array.isArray(game.prefilled_players) ? game.prefilled_players.length : 0;
  const hostPlaying = game.host_is_playing ? 1 : 0;
  const totalPlayers = (count || 0) + prefilledCount + hostPlaying;
  const spotsLeft = Math.max(0, game.max_players - totalPlayers);

  const date = new Date(game.date_time).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })

  const levelLabel = formatLevelBadge(game.min_level, game.max_level, game.skill_level);
  const levelPart = levelLabel ? ` · 🏅 ${levelLabel}` : '';

  const title = `🎾 ${game.title}`
  const description = `📍 ${game.location} · 🗓 ${date} · 👥 ${spotsLeft} spots left${levelPart} · Hosted by ${host?.name || 'Someone'}`
  const joinPath = game.slug || game.id
  const siteUrl = Deno.env.get('SITE_URL') || 'https://padel-palooza-play.lovable.app'
  const appUrl = `${siteUrl}/games/${game.id}`
  const image = `${siteUrl}/og-image.png`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${appUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0;url=${appUrl}" />
  <title>${title}</title>
</head>
<body>
  <p>Redirecting to match...</p>
  <a href="${appUrl}">Click here if not redirected</a>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
    },
  })
})
