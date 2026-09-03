# Úkolovník 📝

Moderní, přehledná a plně lokalizovaná webová aplikace pro správu úkolů a time management. Běží kompletně na straně klienta ve vašem prohlížeči, bez nutnosti backendu, registrace či instalace závislostí.

---

## 🚀 Co aplikace umí (Funkce)

- **Kompletní správa úkolů (CRUD):**
  - Snadné přidávání úkolů s limitem do 200 znaků.
  - Možnost inline editace přímo v seznamu (text, kategorie, priorita, termín).
  - Rychlé mazání s plynulou animací.
  - Odškrtávání hotových/splněných položek.
- **Kategorizace:** Zařazení úkolů do 8 předdefinovaných okruhů (*Škola*, *Finance*, *Osobní*, *Cvičení*, *Práce*, *Zdraví*, *Nákupy*, *Domácnost*).
- **Priority:** Nastavení priority se sémantickým barevným odlišením (*Vysoká* – červená, *Střední* – oranžová, *Nízká* – zelená).
- **Termíny a notifikace (Due Dates):** Nastavení přesného data a času splnění včetně vizuálního zvýraznění zpožděných úkolů a upozornění na splatnost.
- **Řazení a Drag & Drop:** Možnost ručního přeuspořádání úkolů přetažením myší (Drag & Drop) nebo pomocí tlačítek nahoru/dolů (↑/↓).
- **Filtrování a statistiky:**
  - Filtrování podle stavu (*Všechny*, *Aktivní*, *Hotové*).
  - Filtrování podle konkrétních kategorií.
  - Dynamické počítadlo zbývajících úkolů se správným českým skloňováním (*1 úkol*, *2–4 úkoly*, *5+ úkolů*).
  - Interaktivní koláčový graf splnění (Chart.js) znázorňující poměr hotových a zbývajících úkolů.
- **Tmavý minimalistický design:** Responzivní rozhraní přizpůsobené mobilním zařízením i desktopu s podporou klávesových zkratek (`Enter` pro uložení, `Escape` pro zrušení).

---

## 💾 Ukládání dat (localStorage)

Aplikace funguje na principu **Local-First**:
- Všechna data se ukládají přímo do vašeho webového prohlížeče prostřednictvím rozhraní **`localStorage`** pod klíčem `arch_ukoly_v1`.
- **Soukromí:** Žádná data se neposílají na vzdálené servery ani do cloudu. Vaše záznamy zůstávají výhradně na vašem zařízení.
- **Perzistence:** Úkoly zůstávají uložené i po obnovení stránky nebo zavření prohlížeče (aplikace navíc automaticky ukládá stav při přepnutí karty či odchodu ze stránky).

---

## 🔄 Export a Import dat

V horní liště aplikace naleznete nástroje pro zálohování a přenositelnost dat:

- **Export:** Kliknutím na tlačítko **„Exportovat úkoly“** se vygeneruje a stáhne standardní soubor ve formátu JSON (např. `ukoly-2026-09-02.json`). Ten obsahuje kompletní stav vašich úkolů včetně metadat a časových razítek.
- **Import:** Pomocí tlačítka **„Importovat úkoly“** můžete nahrát dříve exportovaný soubor JSON.
  - Importovaný soubor prochází automatickou validací a normalizací dat.
  - Při úspěšném načtení nahradí stávající úkoly importovanými záznamy a zachová správné pořadí.

---

## ⚖️ Licence (GNU AGPLv3)

Tento projekt je šířen pod svobodnou licencí **GNU Affero General Public License v3.0 (AGPLv3)**.

### Co to znamená pro uživatele?
- **Svoboda používání:** Můžete aplikaci bezplatně a neomezeně používat pro osobní i komerční účely.
- **Soukromí a transparentnost:** Máte jistotu, že kód je plně otevřený (open-source) a můžete si kdykoli zkontrolovat, co přesně dělá s vašimi daty.

### Co to znamená pro programátory a vývojáře?
- **Silný copyleft:** Pokud kód projektu upravíte, rozšíříte nebo jej začleníte do svého projektu, výsledné dílo musí být rovněž šířeno pod stejnou licencí AGPLv3.
- **Síťová doložka (Network Use):** Klíčová vlastnost licence AGPL – pokud tuto aplikaci (nebo její modifikaci) provozujete na serveru a poskytujete ji uživatelům přes síť či internet (SaaS), **musíte uživatelům zpřístupnit kompletní zdrojový kód** dané běžící verze.
- **Zachování informací:** Při distribuci je nutné zachovat původní autorská práva a text licence.
