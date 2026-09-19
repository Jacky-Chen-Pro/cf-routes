#!/usr/bin/env node
/**
 * 把 routes.source.json 签名后写成 routes.json（客户端只认带有效签名的 routes.json）。
 *
 *   node sign.mjs            生成 routes.json
 *   node sign.mjs --verify   只校验现有 routes.json
 *
 * 私钥不在这个仓库里：默认读 ~/.chatgpt-family/routes-signing-key.pem（可用 ROUTES_SIGNING_KEY 指定）。
 * ★私钥丢了 = 再也发不了新列表（客户端里内置的是对应的公钥），只能发新版客户端换公钥。务必备份。
 */
import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const here = path.dirname(new URL(import.meta.url).pathname)
const OUT = path.join(here, "routes.json")
const keyDir = path.join(os.homedir(), ".chatgpt-family")
const privPath = process.env.ROUTES_SIGNING_KEY || path.join(keyDir, "routes-signing-key.pem")
const pubPath = path.join(keyDir, "routes-signing-key.pub.pem")

function verify(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"))
  const ok = crypto.verify(null, Buffer.from(j.payload, "utf8"), fs.readFileSync(pubPath), Buffer.from(j.sig, "base64"))
  const p = JSON.parse(j.payload)
  console.log(ok ? "✓ 签名有效" : "✗ 签名无效", `· 签发于 ${new Date(p.issuedAt).toISOString()} · ${p.routes.length} 条线路`)
  for (const r of p.routes) console.log(`   ${r.id.padEnd(14)} ${r.base}  ${r.label}`)
  return ok
}

if (process.argv.includes("--verify")) process.exit(verify(OUT) ? 0 : 1)

const src = JSON.parse(fs.readFileSync(path.join(here, "routes.source.json"), "utf8"))
if (!Array.isArray(src.routes) || !src.routes.length) throw new Error("routes.source.json 里没有线路")
for (const r of src.routes) {
  const u = new URL(r.base)
  if (u.protocol !== "https:" || u.pathname !== "/" || !r.id) throw new Error(`线路不合法（必须是 https 根地址且有 id）：${JSON.stringify(r)}`)
}
// payload 是一段**字符串**：客户端对这段字符串原样验签后再 JSON.parse，避免「同一份 JSON 序列化结果不同」的坑。
// issuedAt 用来防回滚：客户端会拒绝比它见过的更旧的列表。
const payload = JSON.stringify({ issuedAt: Date.now(), routes: src.routes.map(({ id, base, label }) => ({ id, base: new URL(base).origin, label: label || new URL(base).host })) })
const sig = crypto.sign(null, Buffer.from(payload, "utf8"), fs.readFileSync(privPath)).toString("base64")
fs.writeFileSync(OUT, JSON.stringify({ v: 1, payload, sig }, null, 2) + "\n")
verify(OUT)
