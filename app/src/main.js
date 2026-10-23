import { Buffer } from "buffer"; window.Buffer = Buffer;
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@anchor-lang/core";
import { getWallets } from "@wallet-standard/app";
import { isWalletAdapterCompatibleStandardWallet } from "@solana/wallet-adapter-base";
import { StandardWalletAdapter } from "@solana/wallet-standard-wallet-adapter-base";
import idl from "./idl.json";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const programId = new PublicKey(idl.address);
const $ = (id) => document.getElementById(id);
const ex = (p) => `https://explorer.solana.com/${p}?cluster=devnet`;
$("plink").href = ex("address/" + programId); $("plink").textContent = programId.toBase58();

let adapter = null;
const found = new Map();
function renderWallets() {
  const box = $("wallets"); box.innerHTML = "";
  if (!found.size) {
    const u = encodeURIComponent(location.href), r = encodeURIComponent(location.origin);
    box.innerHTML = `<div class="muted">No wallet found. On a phone, open this page in a wallet browser: <a href="https://phantom.app/ul/browse/${u}?ref=${r}">Phantom</a> · <a href="https://solflare.com/ul/v1/browse/${u}?ref=${r}">Solflare</a></div>`;
    return;
  }
  for (const [name, w] of found) {
    const b = document.createElement("button"); b.textContent = "Connect " + name;
    b.onclick = () => connect(w); box.appendChild(b);
  }
}
const wallets = getWallets();
function addAll() {
  for (const w of wallets.get()) if (isWalletAdapterCompatibleStandardWallet(w)) found.set(w.name, w);
  renderWallets();
}
addAll(); wallets.on("register", addAll);

async function connect(w) {
  try {
    adapter = new StandardWalletAdapter({ wallet: w });
    await adapter.connect();
    $("status").textContent = "Connected: " + adapter.publicKey.toBase58() + " (set your wallet to devnet)";
    $("send").disabled = false;
  } catch (e) { $("status").textContent = "Connect failed: " + e.message; }
}

function program() {
  const provider = new anchor.AnchorProvider(connection, {
    publicKey: adapter.publicKey,
    signTransaction: (t) => adapter.signTransaction(t),
    signAllTransactions: (t) => adapter.signAllTransactions(t),
  }, { commitment: "confirmed" });
  return new anchor.Program(idl, provider);
}

$("send").onclick = async () => {
  $("tx").textContent = "Waiting for wallet…";
  try {
    const p = program();
    const sig = await p.methods.sayHello($("msg").value).accounts({ author: adapter.publicKey }).rpc();
    $("tx").innerHTML = `Sent! <a target="_blank" href="${ex("tx/" + sig)}">View transaction</a>`;
    load();
  } catch (e) { $("tx").textContent = "Failed: " + (e.message || e); }
};

async function load() {
  try {
    const dummy = new anchor.AnchorProvider(connection, { publicKey: PublicKey.default, signTransaction: async t => t, signAllTransactions: async t => t }, {});
    const p = new anchor.Program(idl, dummy);
    const all = await p.account.greeting.all();
    all.sort((a, b) => b.account.updates.toNumber() - a.account.updates.toNumber());
    $("list").innerHTML = all.length ? all.slice(0, 20).map(x =>
      `<p><span class="msg"></span><br><span class="mono">${x.account.author.toBase58()} · updates: ${x.account.updates.toString()} · <a target="_blank" href="${ex("address/" + x.publicKey)}">account</a></span></p>`).join("") : "No greetings yet.";
    const spans = $("list").querySelectorAll(".msg");
    all.slice(0, 20).forEach((x, i) => spans[i].textContent = x.account.message);
  } catch (e) { $("list").textContent = "Could not load: " + e.message; }
}
load();
