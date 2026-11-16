/* Checagem de sintaxe do app (16/11/2026): roda antes de publicar. Falhou = NÃO publicar. */
const fs = require("fs"); let erros = 0;
for (const arq of ["tempo-real.html", "compartilhar.html", "parceiro.html", "checkout.html", "nfc.html", "instalar.html", "leitor-placas.html", "index.html"]) {
  if (!fs.existsSync(arq)) continue;
  const s = fs.readFileSync(arq, "utf8"); let i = 0;
  for (const m of s.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="(?:application\/ld\+json|text\/template)")[^>]*>([\s\S]*?)<\/script>/g)) {
    i++; try { new Function(m[1]); } catch (e) { erros++; console.log("ERRO " + arq + " (bloco " + i + "): " + e.message); }
  }
}
for (const arq of ["natal.js", "sw.js"]) { if (!fs.existsSync(arq)) continue; try { new Function(fs.readFileSync(arq, "utf8")); } catch (e) { erros++; console.log("ERRO " + arq + ": " + e.message); } }
console.log(erros ? erros + " erro(s) de sintaxe" : "Sintaxe OK"); process.exit(erros ? 1 : 0);
