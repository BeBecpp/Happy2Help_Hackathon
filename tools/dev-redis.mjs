// DEV-ONLY in-memory Redis-protocol (RESP2) stub.
//
// Why: erxes-api-shared's startPlugin registers the plugin with the erxes
// gateway through Redis. On this Windows laptop without Docker there is no
// Redis, so this tiny server answers the handful of commands service
// discovery uses (GET/SET/DEL/KEYS/INFO/PING…) and lets the official plugin
// code run unmodified. It is NOT Redis, is never used at a real erxes host,
// and is never presented as part of the erxes integration.
import net from "node:net";

export function startDevRedis(port = 6399, host = "127.0.0.1") {
  const store = new Map();
  const expiries = new Map();
  const subscribers = new Map(); // channel -> Set<socket>

  const alive = (key) => {
    const exp = expiries.get(key);
    if (exp !== undefined && exp <= Date.now()) {
      store.delete(key);
      expiries.delete(key);
      return false;
    }
    return store.has(key);
  };
  const enc = {
    simple: (s) => `+${s}\r\n`,
    error: (s) => `-${s}\r\n`,
    int: (n) => `:${n}\r\n`,
    bulk: (s) => (s === null || s === undefined ? "$-1\r\n" : `$${Buffer.byteLength(s)}\r\n${s}\r\n`),
    array: (items) => `*${items.length}\r\n${items.join("")}`,
  };
  const globToRegex = (glob) => new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");

  const handle = (socket, args) => {
    const cmd = String(args[0] ?? "").toUpperCase();
    const a = args.slice(1);
    switch (cmd) {
      case "PING": return enc.simple("PONG");
      case "ECHO": return enc.bulk(a[0] ?? "");
      case "AUTH": case "SELECT": case "CLIENT": case "QUIT": return enc.simple("OK");
      case "HELLO": return enc.error("ERR unknown command 'HELLO'");
      case "INFO": return enc.bulk("# Server\r\nredis_version:7.2.0-dev-stub\r\nredis_mode:standalone\r\n# Persistence\r\nloading:0\r\n");
      case "GET": return enc.bulk(alive(a[0]) ? store.get(a[0]) : null);
      case "SET": {
        const [key, value, ...opts] = a;
        let nx = false, ex;
        for (let i = 0; i < opts.length; i++) {
          const o = String(opts[i]).toUpperCase();
          if (o === "NX") nx = true;
          else if (o === "EX") ex = Number(opts[++i]) * 1000;
          else if (o === "PX") ex = Number(opts[++i]);
        }
        if (nx && alive(key)) return enc.bulk(null);
        store.set(key, value);
        if (ex) expiries.set(key, Date.now() + ex); else expiries.delete(key);
        return enc.simple("OK");
      }
      case "DEL": { let n = 0; for (const k of a) { if (alive(k)) n++; store.delete(k); expiries.delete(k); } return enc.int(n); }
      case "EXISTS": return enc.int(a.filter(alive).length);
      case "EXPIRE": { if (!alive(a[0])) return enc.int(0); expiries.set(a[0], Date.now() + Number(a[1]) * 1000); return enc.int(1); }
      case "TTL": { if (!alive(a[0])) return enc.int(-2); const e = expiries.get(a[0]); return enc.int(e ? Math.ceil((e - Date.now()) / 1000) : -1); }
      case "INCR": { const v = (alive(a[0]) ? Number(store.get(a[0])) : 0) + 1; store.set(a[0], String(v)); return enc.int(v); }
      case "KEYS": { const re = globToRegex(a[0] ?? "*"); return enc.array([...store.keys()].filter((k) => alive(k) && re.test(k)).map(enc.bulk)); }
      case "SCAN": { const re = globToRegex(a[a.indexOf("MATCH") + 1] ?? "*"); return enc.array([enc.bulk("0"), enc.array([...store.keys()].filter((k) => alive(k) && re.test(k)).map(enc.bulk))]); }
      case "HSET": { const h = JSON.parse(store.get(a[0]) ?? "{}"); let added = 0; for (let i = 1; i < a.length; i += 2) { if (!(a[i] in h)) added++; h[a[i]] = a[i + 1]; } store.set(a[0], JSON.stringify(h)); return enc.int(added); }
      case "HGET": { const h = JSON.parse(store.get(a[0]) ?? "{}"); return enc.bulk(h[a[1]] ?? null); }
      case "HGETALL": { const h = JSON.parse(store.get(a[0]) ?? "{}"); return enc.array(Object.entries(h).flat().map(enc.bulk)); }
      case "SUBSCRIBE": case "PSUBSCRIBE": {
        let out = "";
        a.forEach((ch, i) => { if (!subscribers.has(ch)) subscribers.set(ch, new Set()); subscribers.get(ch).add(socket); out += enc.array([enc.bulk(cmd.toLowerCase()), enc.bulk(ch), enc.int(i + 1)]); });
        return out;
      }
      case "UNSUBSCRIBE": case "PUNSUBSCRIBE": { for (const set of subscribers.values()) set.delete(socket); return enc.array([enc.bulk(cmd.toLowerCase()), enc.bulk(a[0] ?? null), enc.int(0)]); }
      case "PUBLISH": { const set = subscribers.get(a[0]); let n = 0; set?.forEach((s) => { n++; s.write(enc.array([enc.bulk("message"), enc.bulk(a[0]), enc.bulk(a[1])])); }); return enc.int(n); }
      case "FLUSHALL": case "FLUSHDB": store.clear(); expiries.clear(); return enc.simple("OK");
      case "EVAL": {
        // erxes-api-shared 3.3.x registers a plugin with one Lua script of the form
        //   redis.call('set', KEYS[1], ARGV[1]) ... return 1
        // Execute that exact pattern (set/del/expire of KEYS[i] with ARGV[j]); anything else is refused.
        const [script, numKeysRaw, ...rest] = a;
        const numKeys = Number(numKeysRaw);
        const KEYS = rest.slice(0, numKeys);
        const ARGV = rest.slice(numKeys);
        const calls = [...String(script).matchAll(/redis\.call\(\s*'(\w+)'\s*,\s*KEYS\[(\d+)\]\s*(?:,\s*ARGV\[(\d+)\])?\s*\)/g)];
        const stripped = String(script).replace(/redis\.call\([^)]*\)/g, "").replace(/return\s+\d+/g, "").replace(/\s/g, "");
        if (!calls.length || stripped !== "") return enc.error("ERR dev stub only supports simple redis.call('set'|'del'|'expire', KEYS[i], ARGV[j]) scripts");
        for (const [, name, ki, ai] of calls) {
          const args = [name.toUpperCase(), KEYS[Number(ki) - 1]];
          if (ai !== undefined) args.push(ARGV[Number(ai) - 1]);
          const reply = handle(socket, args);
          if (reply.startsWith("-")) return reply;
        }
        const ret = String(script).match(/return\s+(\d+)/);
        return enc.int(ret ? Number(ret[1]) : 1);
      }
      case "EVALSHA": return enc.error("NOSCRIPT No matching script. Please use EVAL.");
      case "SCRIPT": return enc.simple("OK");
      default: return enc.error(`ERR unknown command '${cmd}' (dev stub)`);
    }
  };

  // Minimal RESP2 array parser with partial-buffer support.
  const parse = (buf) => {
    const commands = [];
    let pos = 0;
    while (pos < buf.length) {
      if (buf[pos] !== 0x2a) { // not '*': inline command
        const nl = buf.indexOf("\r\n", pos);
        if (nl === -1) break;
        commands.push(buf.slice(pos, nl).toString().trim().split(/\s+/));
        pos = nl + 2;
        continue;
      }
      const nl = buf.indexOf("\r\n", pos);
      if (nl === -1) break;
      const count = Number(buf.slice(pos + 1, nl));
      let p = nl + 2;
      const items = [];
      let ok = true;
      for (let i = 0; i < count; i++) {
        if (buf[p] !== 0x24) { ok = false; break; }
        const n2 = buf.indexOf("\r\n", p);
        if (n2 === -1) { ok = false; break; }
        const len = Number(buf.slice(p + 1, n2));
        if (buf.length < n2 + 2 + len + 2) { ok = false; break; }
        items.push(buf.slice(n2 + 2, n2 + 2 + len).toString());
        p = n2 + 2 + len + 2;
      }
      if (!ok) break;
      commands.push(items);
      pos = p;
    }
    return { commands, rest: buf.slice(pos) };
  };

  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const { commands, rest } = parse(buffer);
      buffer = rest;
      for (const args of commands) {
        try { socket.write(handle(socket, args)); } catch (e) { socket.write(enc.error(`ERR ${e.message}`)); }
      }
    });
    socket.on("close", () => { for (const set of subscribers.values()) set.delete(socket); });
    socket.on("error", () => {});
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve({ port, host, close: () => new Promise((r) => server.close(() => r())), size: () => store.size, dump: () => Object.fromEntries(store) }));
  });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  const port = Number(process.env.REDIS_PORT || 6399);
  startDevRedis(port).then(() => console.log(`[dev-redis] stub listening on 127.0.0.1:${port} (NOT real Redis — local development only)`));
}
