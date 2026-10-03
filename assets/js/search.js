// search.js — filter box + strand/section toggles for the publications and archive lists
// (SPECIFICATION.md §9.4). Progressive enhancement: it injects its own UI, so the filter never
// appears without working, and the full list is fully functional with this script absent.
// All labels come from the template via the #filter-config JSON block, never hard-coded here.
(function () {
  var mount = document.getElementById('search-filter');
  var cfgEl = document.getElementById('filter-config');
  if (!mount || !cfgEl) return;
  var cfg = JSON.parse(cfgEl.textContent);

  // Revalidate on every load (a cheap 304 when unchanged): a cached index from before a new
  // entry leaves that entry unfilterable — it matches everything and contributes no toggles.
  fetch(cfg.index, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (records) {
    var bySlug = {};
    records.forEach(function (rec) { bySlug[rec.slug] = rec; });

    var items = [].slice.call(document.querySelectorAll('li.csl-entry'));
    var sections = [].slice.call(document.querySelectorAll('section.pub-section'));
    var recOf = function (li) { return bySlug[li.id.replace(/^pub-/, '')]; };

    // Only offer toggles for strands/sections/languages actually present on this page.
    var strandsHere = {}, sectionsHere = {}, langsHere = {};
    items.forEach(function (li) {
      var rec = recOf(li); if (!rec) return;
      (rec.strands || []).forEach(function (s) { strandsHere[s] = true; });
      if (rec.section) sectionsHere[rec.section] = true;
      if (rec.lang) langsHere[rec.lang] = true;
    });

    var activeStrands = {}, activeSections = {}, activeLangs = {}, query = '';

    var box = document.createElement('div');
    box.className = 'filter-box';
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = cfg.labels.filter;
    input.setAttribute('aria-label', cfg.labels.filter);
    input.addEventListener('input', function () { query = input.value.toLowerCase(); apply(); });
    box.appendChild(input);

    function toggles(present, labels, order, active) {
      var wrap = document.createElement('div');
      wrap.className = 'filter-toggles';
      // Config order first (strands, then keywords, §6.2b), then anything unlabelled.
      var seen = {};
      (order || []).concat(Object.keys(present)).forEach(function (id) {
        if (!present[id] || seen[id]) return;
        seen[id] = true;
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = labels[id] || id;
        b.addEventListener('click', function () {
          if (active[id]) { delete active[id]; b.classList.remove('on'); }
          else { active[id] = true; b.classList.add('on'); }
          apply();
        });
        wrap.appendChild(b);
      });
      return wrap;
    }
    var order = cfg.order || {};
    box.appendChild(toggles(strandsHere, cfg.strands, order.strands, activeStrands));
    box.appendChild(toggles(sectionsHere, cfg.sections, order.sections, activeSections));
    box.appendChild(toggles(langsHere, cfg.langs || {}, order.langs, activeLangs));
    mount.appendChild(box);

    function matches(rec) {
      if (!rec) return true;
      var sSel = Object.keys(activeStrands);
      if (sSel.length && !sSel.some(function (s) { return (rec.strands || []).indexOf(s) >= 0; })) return false;
      var cSel = Object.keys(activeSections);
      if (cSel.length && cSel.indexOf(rec.section) < 0) return false;
      var lSel = Object.keys(activeLangs);
      if (lSel.length && lSel.indexOf(rec.lang) < 0) return false;
      if (query) {
        var hay = [rec.title, rec.titletranslation, rec.titletransliteration,
                   rec.authors, rec.venue, rec.year].concat((rec.strands || []).map(
                     function (s) { return cfg.strands[s] || s; })).join(' ').toLowerCase();
        if (hay.indexOf(query) < 0) return false;
      }
      return true;
    }

    function apply() {
      items.forEach(function (li) { li.style.display = matches(recOf(li)) ? '' : 'none'; });
      sections.forEach(function (sec) {
        var any = [].some.call(sec.querySelectorAll('li.csl-entry'),
          function (li) { return li.style.display !== 'none'; });
        sec.style.display = any ? '' : 'none';
      });
    }
  });
})();
