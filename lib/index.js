import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// dsh-theme-button -- DSH bundle, Host half.
//
// Injects one inline script row into the DSH Web index so the browser half
// (lib/client.js) runs and draws the floating theme button, and serves that
// file over HTTP.
//
// Two delivery channels, both registered:
//  1. the structured "webserver/index-inject" table -- the only channel the
//     official desktop shell honours, because it reads its index.html straight
//     off disk and never runs the index transform;
//  2. webServer.tapIndex -- for plain browser hosts that do render the index.
//
// The row is kind:"script" (inline text), not kind:"script-src": the page-side
// boot interpreter awaits script-src loads, so one failed load would reject the
// whole boot. The inline row builds its own <script src> and swallows onerror,
// so a missing route can never break startup.
//
// Service resolution deliberately uses ctx.inject([...]) rather than a one-shot
// lookup: it waits for webServer to be available and re-runs if it restarts.

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_FILE_CANDIDATES = [
  path.join(HERE, "client.js"),
  path.join(HERE, "..", "lib", "client.js"),
]

const ROUTE = "/dsh-theme-button/button.js"
const LOG_TAG = "[dsh-theme-button]"


function bootRowText() {
  return (
    "(function(){try{" +
    "var d=document.body||document.head||document.documentElement;if(!d)return;" +
    "var s=document.createElement('script');s.src=" + JSON.stringify(ROUTE) + ";" +
    "s.async=false;s.onerror=function(){};" +
    "d.appendChild(s)" +
    "}catch(e){}})()"
  )
}

function rowAlreadyPushed(table) {
  for (const row of table) {
    if (!row) continue
    if (row.kind === "script-src" && row.src === ROUTE) return true
    if (row.kind === "script" && typeof row.text === "string" && row.text.indexOf(ROUTE) !== -1) return true
  }
  return false
}

let clientCache = null

function loadClientScript() {
  for (const candidate of CLIENT_FILE_CANDIDATES) {
    try {
      const info = fs.statSync(candidate)
      if (clientCache && clientCache.mtimeMs === info.mtimeMs) return clientCache.text
      const text = fs.readFileSync(candidate, "utf8")
      clientCache = { mtimeMs: info.mtimeMs, text }
      return text
    } catch (err) {
      // Try the next candidate.
    }
  }
  return null
}

// ---- official appearance preference -----------------------------------------
//
// The shipped Appearance control does not use localStorage and does not read any
// data-attribute for the choice: `@deepseek-ai/dsh-client-ui-theme` keeps
// `preference` (light | dark | system) in the `ui-theme` settings namespace,
// which the Host persists into this profile's cordis.patch.yml. Writing that
// value is therefore the only way to change the real, persisted preference.
const THEME_ENTRY_ID = "ui-theme"
const THEME_MODULE_NAME = "@deepseek-ai/dsh-client-ui-theme"
const THEME_VALUES = ["light", "dark", "system"]

function profilePatchPath() {
  const home = process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || "", ".dsh")
  const profile = process.env.DSH_PROFILE || "desktop"
  return path.join(home, "profiles", profile, "cordis.patch.yml")
}

function readThemePreference() {
  try {
    const text = fs.readFileSync(profilePatchPath(), "utf8")
    // Match the ui-theme entry block and pull its `preference:` value.
    const block = text.match(
      new RegExp("- id: " + THEME_ENTRY_ID + "\\r?\\n(?:.*\\r?\\n)*?\\s+preference:\\s*(\\S+)"),
    )
    if (block && THEME_VALUES.indexOf(block[1]) !== -1) return block[1]
    // An entry may exist without an explicit config block; the default is system.
    if (new RegExp("- id: " + THEME_ENTRY_ID + "\\b").test(text)) return "system"
  } catch (err) {
    // Fall through to the default.
  }
  return null
}

function writeThemePreference(value) {
  const file = profilePatchPath()
  const text = fs.readFileSync(file, "utf8")
  const entryRe = new RegExp("(- id: " + THEME_ENTRY_ID + "\\r?\\n(?:[ \\t]+.*\\r?\\n?)*)")
  const match = text.match(entryRe)
  let next
  if (match) {
    const block = match[1]
    const updated = /preference:/.test(block)
      ? block.replace(/preference:\s*\S+/, "preference: " + value)
      : block.replace(/\s*$/, "") + "\n  config:\n    preference: " + value + "\n"
    next = text.replace(block, updated)
  } else {
    next = text.replace(/\s*$/, "") + "\n- id: " + THEME_ENTRY_ID + "\n  name: \"" + THEME_MODULE_NAME + "\"\n  config:\n    preference: " + value + "\n"
  }
  if (!/preference:\s*[a-z]+/.test(next)) throw new Error("preference not written")
  fs.writeFileSync(file, next, "utf8")
  return value
}

export default {
  name: "dsh-theme-button",
  apply(root) {
    // ---- (1) the boot row, registered before anything can delay us ----------
    // The desktop shell collects this table once during host startup, so the
    // subscription must not sit behind a service dependency.
    const rowDisposers = []
    root.effect(() => () => {
      for (const dispose of rowDisposers) {
        try {
          dispose()
        } catch (err) {
          // Ignore teardown noise.
        }
      }
    })
    rowDisposers.push(
      root.on("webserver/index-inject", (table) => {
        try {
          if (!Array.isArray(table)) return
          if (rowAlreadyPushed(table)) return
          table.push({ kind: "script", placement: "body", text: bootRowText() })
          root.logger?.info?.(LOG_TAG + " pushed boot row")
        } catch (err) {
          // Never let an injection failure escape into boot.
        }
      }),
    )

    // ---- (2) HTTP delivery -------------------------------------------------
    const disposers = []
    root.effect(() => () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch (err) {
          // Ignore teardown noise.
        }
      }
    })

    root.inject(["webServer"], (ctx) => {
      ctx.effect(() => () => {
        for (const dispose of disposers.splice(0)) {
          try {
            dispose()
          } catch (err) {
            // Ignore teardown noise.
          }
        }
      })

      disposers.push(
        ctx.webServer.register({
          kind: "exact",
          path: ROUTE,
          handler: (req, res) => {
            const text = loadClientScript()
            if (text === null) {
              res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
              res.end("dsh-theme-button: client script not found")
              return
            }
            res.writeHead(200, {
              "Content-Type": "application/javascript; charset=utf-8",
              "Cache-Control": "no-store",
            })
            res.end(text)
          },
        }),
      )
      ctx.logger?.info?.(LOG_TAG + " registered route " + ROUTE)

      // Live-reload feed. The desktop shell has no address bar and cannot be
      // refreshed by hand, so the browser half polls this version (the client
      // script's mtime) and reloads the page itself when a new build lands. That
      // makes iterating on this plugin possible without restarting the whole app.
      disposers.push(
        ctx.webServer.register({
          kind: "exact",
          path: "/dsh-theme-button/version",
          handler: (req, res) => {
            let version = "0"
            try {
              const found = CLIENT_FILE_CANDIDATES.map((p) => {
                try { return fs.statSync(p).mtimeMs } catch (err) { return 0 }
              })
              version = String(Math.max.apply(null, found) || 0)
            } catch (err) {}
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" })
            res.end(JSON.stringify({ version: version }))
          },
        }),
      )

      // Official appearance preference: read it for the switcher's initial state,
      // write it when a card is clicked. `value` is strictly validated against the
      // three built-in ids before anything touches the profile file.
      disposers.push(
        ctx.webServer.register({
          kind: "exact",
          path: "/dsh-theme-button/theme",
          handler: (req, res) => {
            const send = (code, body) => {
              res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" })
              res.end(JSON.stringify(body))
            }
            try {
              const url = new URL(String(req.url || ""), "http://localhost")
              const value = url.searchParams.get("set")
              if (value === null) {
                send(200, { preference: readThemePreference() })
                return
              }
              if (THEME_VALUES.indexOf(value) === -1) {
                send(400, { error: "unsupported preference" })
                return
              }
              writeThemePreference(value)
              ctx.logger?.info?.(LOG_TAG + " preference -> " + value)
              send(200, { preference: value })
            } catch (err) {
              send(500, { error: String((err && err.message) || err) })
            }
          },
        }),
      )

      disposers.push(
        ctx.webServer.tapIndex((html) => {
          if (typeof html !== "string") return html
          if (html.indexOf(ROUTE) !== -1) return html
          const tag = '<script defer src="' + ROUTE + '"></script>'
          if (html.indexOf("</body>") !== -1) return html.replace("</body>", tag + "</body>")
          return html + tag
        }),
      )
    })
  },
}