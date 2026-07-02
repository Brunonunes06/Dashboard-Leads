// Lightweight shim to avoid console errors when Chart.js CDN is blocked.
// This does NOT implement real charting — it's a safe no-op replacement for development.
(function () {
  if (window.Chart) return;
  function noop() {}
  var Chart = function () {};
  Chart.getChart = function () { return null; };
  Chart.getChartById = function () { return null; };
  Chart.register = noop;
  Chart.defaults = {};
  Chart.prototype.update = noop;
  Chart.prototype.destroy = noop;
  window.Chart = Chart;
})();
