(function () {
  "use strict";
  var C = window.StallSpeedWeightBankCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function render() {
    var r = C.compute({
      vsRef: $("vsRef").value, weightRef: $("wRef").value, weight: $("weight").value,
      bankDeg: $("bank").value, loadFactor: $("n").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a positive stall speed and weight, and a bank below 90° (or a positive load factor).</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = ""; $("extra-results").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.vs, 1) + '</span> <span class="unit"></span>';
    $("out-sub").textContent = "√(W/Wref) = " + fmt(r.weightFactor, 3) + " · √n = " + fmt(r.bankFactor, 3) + " · n = " + fmt(r.loadFactor, 3) + " at " + fmt(r.bankDeg, 1) + "°";
    $("stat-grid").innerHTML =
      stat("Vs at this weight and bank", fmt(r.vs, 1), "") +
      stat("Weight only (wings level)", fmt(r.vsWeightOnly, 1), "same weight, n = 1") +
      stat("Bank only (at Wref)", fmt(r.vsBankOnly, 1), "published weight, this bank") +
      stat("Load factor", fmt(r.loadFactor, 3), r.fromLoadFactor ? "from n, implied bank " + fmt(r.bankDeg, 1) + "°" : "n = 1/cos φ");
    $("extra-results").innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Bank</th><th>n</th><th>Vs at this weight</th></tr></thead><tbody>' +
      r.table.map(function (row) {
        return "<tr><td>" + row.bankDeg + "°</td><td>" + fmt(row.loadFactor, 3) + "</td><td>" + fmt(row.vs, 1) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  $("btn-ex").addEventListener("click", function () {
    $("vsRef").value = "48"; $("wRef").value = "2550"; $("weight").value = "2200"; $("bank").value = "45"; $("n").value = "";
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();
