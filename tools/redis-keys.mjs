#!/usr/bin/env node
// Lists the erxes service-discovery keys the running plugin wrote to Redis (RESP over TCP, no deps).
//   node tools/redis-keys.mjs [host] [port]
import net from "node:net";

const [host = "127.0.0.1", port = "6399"] = process.argv.slice(2);

function command(socket, args) {
  return new Promise((resolve, reject) => {
    let buf = "";
    const onData = (chunk) => {
      buf += chunk.toString("utf8");
      const parsed = parse(buf, 0);
      if (parsed) {
        socket.off("data", onData);
        resolve(parsed.value);
      }
    };
    socket.on("data", onData);
    socket.once("error", reject);
    socket.write(`*${args.length}\r\n${args.map((a) => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join("")}`);
  });
}

function parse(s, i) {
  const end = s.indexOf("\r\n", i);
  if (end < 0) return null;
  const type = s[i];
  const line = s.slice(i + 1, end);
  if (type === "+" || type === "-" || type === ":") return { value: line, next: end + 2 };
  if (type === "$") {
    const len = Number(line);
    if (len < 0) return { value: null, next: end + 2 };
    if (Buffer.byteLength(s.slice(end + 2)) < len + 2) return null;
    return { value: s.slice(end + 2, end + 2 + len), next: end + 2 + len + 2 };
  }
  if (type === "*") {
    const n = Number(line);
    const items = [];
    let next = end + 2;
    for (let k = 0; k < n; k++) {
      const item = parse(s, next);
      if (!item) return null;
      items.push(item.value);
      next = item.next;
    }
    return { value: items, next };
  }
  return null;
}

const socket = net.connect(Number(port), host);
await new Promise((r, j) => socket.once("connect", r).once("error", j));
const keys = (await command(socket, ["KEYS", "*"])).filter((k) => /erxes|happy2help/i.test(k)).sort();
console.log(`redis ${host}:${port} · ${keys.length} erxes keys`);
for (const key of keys) {
  // The dev stub has no TYPE: try a string read, then a set read.
  let value = await command(socket, ["GET", key]);
  if (typeof value === "string" && value.startsWith("WRONGTYPE") || value === null) value = await command(socket, ["SMEMBERS", key]);
  console.log(`${key} = ${typeof value === "string" ? value.slice(0, 300) : JSON.stringify(value).slice(0, 300)}`);
}
socket.end();
